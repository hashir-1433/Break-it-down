import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required by guidelines
const getGeminiClient = (req?: express.Request) => {
  const apiKey = (req?.headers['x-gemini-api-key'] as string) || (req?.body?.apiKey as string) || process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API Route: Break down task into 5 micro-steps
app.post('/api/breakdown', async (req, res) => {
  try {
    const { taskTitle, taskContext, energyLevel = 'medium', procrastinationReason = 'overwhelmed', timeAvailable = '1h' } = req.body;

    if (!taskTitle || typeof taskTitle !== 'string' || !taskTitle.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const ai = getGeminiClient(req);

    if (!ai) {
      // Fallback generator when API Key is missing or in offline dev mode
      const fallbackData = generateFallbackBreakdown(taskTitle, energyLevel, procrastinationReason);
      return res.json(fallbackData);
    }

    const systemInstruction = `You are "Break It Down", an elite cognitive anti-procrastination micro-planner.
Your single objective: Take an overwhelming user task and decompose it into EXACTLY 5 chronological, concrete, bite-sized micro-steps that take LESS THAN 20 MINUTES EACH to execute (ideally 5 to 15 minutes).

RULES:
1. STEP 1 MUST BE AN ULTRA-LOW FRICTION STARTER: Step 1 should take 3 to 10 minutes max. It must eliminate blank-page paralyzing friction (e.g. "Create folder & write 3 headings", "Gather 2 source URLs", "Set 5-min timer & list 5 bullet points").
2. BITE-SIZED TIME: Every step must have estimatedMinutes between 5 and 20.
3. CONCRETE MICRO-ACTION: Specify the literal physical or digital action (e.g. "Open browser, go to Google Docs, type title", "Open terminal and create folder 'db-setup'").
4. WHY IT WORKS: A 1-sentence psychological insight explaining how this step lowers cognitive friction or overcomes procrastination.
5. CONTEXT-ADAPTATION:
   - Energy Level: ${energyLevel} (if 'low', make steps ultra-gentle and simple).
   - Procrastination Trigger: ${procrastinationReason} (if 'perfectionism', encourage quick rough drafts/placeholders; if 'overwhelmed', narrow focus down to single micro-objectives).
   - Time Available: ${timeAvailable}.
`;

    const userPrompt = `Task to break down: "${taskTitle}"
${taskContext ? `Additional Context/Details: "${taskContext}"` : ''}

Decompose this into 5 chronological, actionable micro-steps. Also provide a brief 1-sentence overall encouragement and a 1-sentence nudge for Step 1.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            encouragement: {
              type: Type.STRING,
              description: 'A brief, empowering 1-sentence motivational boost.',
            },
            firstStepNudge: {
              type: Type.STRING,
              description: 'A 1-sentence actionable nudge focusing strictly on taking Step 1 right now.',
            },
            steps: {
              type: Type.ARRAY,
              description: 'Exactly 5 micro-steps in chronological order.',
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER, description: '1 to 5' },
                  title: { type: Type.STRING, description: 'Short, clear action title (e.g., "Draft 3 Core Topic Headlines")' },
                  estimatedMinutes: { type: Type.INTEGER, description: 'Estimated time in minutes (5 to 20)' },
                  whyItWorks: { type: Type.STRING, description: '1-sentence psychological anti-procrastination reason' },
                  microAction: { type: Type.STRING, description: 'Literal physical/digital first click or action' },
                  quickTip: { type: Type.STRING, description: 'Optional pro tip or shortcut to stay focused' },
                },
                required: ['stepNumber', 'title', 'estimatedMinutes', 'whyItWorks', 'microAction'],
              },
            },
          },
          required: ['encouragement', 'firstStepNudge', 'steps'],
        },
      },
    });

    const text = response.text?.trim() || '';
    const parsedData = JSON.parse(text);

    return res.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/breakdown:', error);
    // Graceful fallback response if Gemini call fails
    const fallbackData = generateFallbackBreakdown(
      req.body?.taskTitle || 'Big Task',
      req.body?.energyLevel || 'medium',
      req.body?.procrastinationReason || 'overwhelmed'
    );
    return res.json(fallbackData);
  }
});

// API Route: Regenerate a single step
app.post('/api/regenerate-step', async (req, res) => {
  try {
    const { taskTitle, stepNumber, currentStepTitle, allStepsTitles, feedback } = req.body;

    const ai = getGeminiClient(req);
    if (!ai) {
      return res.json({
        stepNumber,
        title: `Quick Starter for Step ${stepNumber}`,
        estimatedMinutes: 10,
        whyItWorks: 'Swapping focus helps break mental blocks.',
        microAction: 'Set a 10-minute timer and focus on a single sub-task.',
        quickTip: 'Keep it simple and avoid perfecting details yet.',
      });
    }

    const systemInstruction = `You are "Break It Down", an anti-procrastination AI planner.
The user wants an alternative, easier, or clearer replacement for Step ${stepNumber} of 5 for task "${taskTitle}".
Current steps surrounding this: ${allStepsTitles.join(' -> ')}.
Goal: Generate a new bite-sized step (${stepNumber} of 5) taking under 20 minutes with high clarity and low friction.`;

    const prompt = `Replace step ${stepNumber} ("${currentStepTitle}"). ${feedback ? `User feedback: "${feedback}"` : ''}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stepNumber: { type: Type.INTEGER },
            title: { type: Type.STRING },
            estimatedMinutes: { type: Type.INTEGER },
            whyItWorks: { type: Type.STRING },
            microAction: { type: Type.STRING },
            quickTip: { type: Type.STRING },
          },
          required: ['stepNumber', 'title', 'estimatedMinutes', 'whyItWorks', 'microAction'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error) {
    console.error('Error regenerating step:', error);
    return res.json({
      stepNumber: req.body?.stepNumber || 1,
      title: `Simplified Action for Step ${req.body?.stepNumber || 1}`,
      estimatedMinutes: 10,
      whyItWorks: 'Narrowing the focus removes the pressure of doing everything at once.',
      microAction: 'Open a scratchpad and write down 2 ideas.',
      quickTip: 'Done is better than perfect!',
    });
  }
});

// Fallback breakdown helper if AI service fails or offline
function generateFallbackBreakdown(title: string, energy: string, reason: string) {
  const isLowEnergy = energy === 'low';
  return {
    encouragement: `Starting is 80% of the battle. You don't need to finish the whole mountain today—just complete Step 1!`,
    firstStepNudge: `Set a 5-minute timer and complete Step 1. If you want to stop after 5 minutes, you have full permission!`,
    steps: [
      {
        stepNumber: 1,
        title: `Set up scratchpad & write 3 bullet points for "${title}"`,
        estimatedMinutes: isLowEnergy ? 5 : 8,
        whyItWorks: 'Eliminates blank page syndrome by lowering the bar to zero-judgment bullet points.',
        microAction: 'Open a blank doc or notebook and type the title at the top.',
        quickTip: 'Don\'t edit or format. Just write raw ideas.',
      },
      {
        stepNumber: 2,
        title: 'Gather core materials, links, or templates',
        estimatedMinutes: 10,
        whyItWorks: 'Removes tool-hunting friction so your focus isn\'t interrupted later.',
        microAction: 'Find 2 relevant reference files or open required tabs.',
        quickTip: 'Close irrelevant tabs to prevent distraction.',
      },
      {
        stepNumber: 3,
        title: 'Draft the ugly first rough pass of Section 1',
        estimatedMinutes: 15,
        whyItWorks: 'Perfectionism causes paralysis. A rough draft gives you something real to polish.',
        microAction: 'Write continuously for 12 minutes without hitting backspace.',
        quickTip: 'Use placeholders like [INSERT DATA LATER] whenever stuck.',
      },
      {
        stepNumber: 4,
        title: 'Flesh out Section 2 and connect key parts',
        estimatedMinutes: 15,
        whyItWorks: 'Builds momentum from Step 3\'s progress.',
        microAction: 'Add 3 sub-points or core logic to the remaining section.',
        quickTip: 'Take a 2-minute stretch break before starting.',
      },
      {
        stepNumber: 5,
        title: 'Final 10-minute review & celebratory wrap-up',
        estimatedMinutes: 10,
        whyItWorks: 'Knowing the end is in sight releases dopamine and solidifies completion.',
        microAction: 'Read through once, fix obvious typos or missing links, and mark done.',
        quickTip: 'Celebrate this win!',
      },
    ],
  };
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Break It Down server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
