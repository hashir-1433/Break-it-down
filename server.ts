import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to extract key and type
const getKeyAndProvider = (req?: express.Request) => {
  const apiKey = (req?.headers['x-gemini-api-key'] as string) || (req?.body?.apiKey as string) || process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) return { apiKey: null, provider: null };
  const trimmed = apiKey.trim();
  if (trimmed.startsWith('sk-or-')) return { apiKey: trimmed, provider: 'openrouter' };
  return { apiKey: trimmed, provider: 'gemini' };
};

// Initialize Gemini SDK
const getGeminiClient = (req?: express.Request) => {
  const { apiKey, provider } = getKeyAndProvider(req);
  if (!apiKey || provider !== 'gemini') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Helper to handle OpenRouter API calls
async function callOpenRouter(apiKey: string, systemInstruction: string, userPrompt: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ais-dev.run.app',
      'X-Title': 'Break It Down',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemInstruction + '\n\nIMPORTANT: You MUST respond strictly in valid raw JSON with NO markdown formatting around it.' },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '{}';
  const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}

// API Route: Break down task into 5 micro-steps
app.post('/api/breakdown', async (req, res) => {
  try {
    const { taskTitle, taskContext, energyLevel = 'medium', procrastinationReason = 'overwhelmed', timeAvailable = '1h' } = req.body;

    if (!taskTitle || typeof taskTitle !== 'string' || !taskTitle.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const { apiKey, provider } = getKeyAndProvider(req);

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

    if (provider === 'openrouter' && apiKey) {
      const openRouterResult = await callOpenRouter(apiKey, systemInstruction, userPrompt);
      return res.json(openRouterResult);
    }

    const ai = getGeminiClient(req);

    if (!ai) {
      // Fallback generator when API Key is missing or in offline dev mode
      const fallbackData = generateFallbackBreakdown(taskTitle, energyLevel, procrastinationReason);
      return res.json(fallbackData);
    }

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
    const isCustomKey = Boolean((req.headers['x-gemini-api-key'] as string)?.trim());
    console.error('Error in /api/breakdown:', error?.message || error);
    
    // Graceful fallback response if Gemini call fails
    const fallbackData = generateFallbackBreakdown(
      req.body?.taskTitle || 'Big Task',
      req.body?.energyLevel || 'medium',
      req.body?.procrastinationReason || 'overwhelmed'
    );

    if (isCustomKey) {
      fallbackData.encouragement = `⚠️ Custom API Key error: ${error?.status === 400 || error?.message?.includes('API key') ? 'Invalid Gemini API Key format. Gemini keys start with "AIzaSy..." (get yours at https://aistudio.google.com/app/apikey).' : error?.message || 'Failed to authenticate.'} Switched to offline backup planner!`;
    }

    return res.json(fallbackData);
  }
});

// API Route: Regenerate a single step
app.post('/api/regenerate-step', async (req, res) => {
  try {
    const { taskTitle, stepNumber, currentStepTitle, allStepsTitles, feedback } = req.body;

    const { apiKey, provider } = getKeyAndProvider(req);

    const systemInstruction = `You are "Break It Down", an anti-procrastination AI planner.
The user wants an alternative, easier, or clearer replacement for Step ${stepNumber} of 5 for task "${taskTitle}".
Current steps surrounding this: ${Array.isArray(allStepsTitles) ? allStepsTitles.join(' -> ') : ''}.
Goal: Generate a new bite-sized step (${stepNumber} of 5) taking under 20 minutes with high clarity and low friction.
Return JSON with format: {"stepNumber": ${stepNumber}, "title": "...", "estimatedMinutes": 10, "whyItWorks": "...", "microAction": "...", "quickTip": "..."}`;

    const prompt = `Replace step ${stepNumber} ("${currentStepTitle}"). ${feedback ? `User feedback: "${feedback}"` : ''}`;

    if (provider === 'openrouter' && apiKey) {
      const openRouterResult = await callOpenRouter(apiKey, systemInstruction, prompt);
      return res.json(openRouterResult);
    }

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
function generateFallbackBreakdown(title: string, energy: string = 'medium', reason: string = 'overwhelmed') {
  const lower = (title || '').toLowerCase();
  const isLowEnergy = energy === 'low';
  
  let steps = [];

  if (lower.match(/clean|room|house|desk|mess|wash|organize|laundry|bedroom|kitchen|tidy/)) {
    steps = [
      {
        stepNumber: 1,
        title: `Clear 1 single surface (e.g., bed or desk) for "${title}"`,
        estimatedMinutes: isLowEnergy ? 5 : 8,
        whyItWorks: 'Clearing one visible spot creates immediate visual calm and breaks momentum paralysis.',
        microAction: 'Set a 5-minute timer and move items off your main desk or bed.',
        quickTip: 'Don\'t sort yet, just move objects into one pile.',
      },
      {
        stepNumber: 2,
        title: 'Sort obvious trash and dirty clothes',
        estimatedMinutes: 8,
        whyItWorks: 'Removing trash gives an instant sense of progress without high decision fatigue.',
        microAction: 'Grab a trash bag and toss wrappers/paper, put dirty clothes in the hamper.',
        quickTip: 'Put on a song or podcast to keep momentum going.',
      },
      {
        stepNumber: 3,
        title: 'Put away 5 loose items to their proper homes',
        estimatedMinutes: 10,
        whyItWorks: 'Tackling small groups of items prevents feeling overwhelmed by the room.',
        microAction: 'Pick up 5 items from the pile and put them in drawers or shelves.',
        quickTip: 'Do not re-organize drawers, just return items to their spots.',
      },
      {
        stepNumber: 4,
        title: 'Quick wipe down or vacuum main floor area',
        estimatedMinutes: 10,
        whyItWorks: 'Wiping surfaces turns messy spaces into fresh workspaces.',
        microAction: 'Use a cloth or vacuum for 5 minutes on visible surfaces.',
        quickTip: 'Keep it quick—perfection is not required.',
      },
      {
        stepNumber: 5,
        title: 'Final 3-minute glance and enjoy your fresh space',
        estimatedMinutes: 5,
        whyItWorks: 'Recognizing completion releases dopamine and reinforces good habits.',
        microAction: 'Step back, take a deep breath, and appreciate your clean space.',
        quickTip: 'You did it! Take a well-deserved break.',
      }
    ];
  } else if (lower.match(/code|app|dev|bug|build|python|java|js|react|database|sql|git|website|program/)) {
    steps = [
      {
        stepNumber: 1,
        title: `Open editor & write 3 bullet point steps for "${title}"`,
        estimatedMinutes: isLowEnergy ? 5 : 8,
        whyItWorks: 'Decomposing technical logic on paper prevents getting lost in code architecture.',
        microAction: 'Open your editor or notes app and type 3 high-level sub-tasks.',
        quickTip: 'Keep bullets super simple—no syntax required yet.',
      },
      {
        stepNumber: 2,
        title: 'Set up project folder/file or branch',
        estimatedMinutes: 8,
        whyItWorks: 'Creating the workspace structure gets the developer mindset warmed up.',
        microAction: 'Create the target file or component and verify basic execution.',
        quickTip: 'Confirm hello-world or basic import works first.',
      },
      {
        stepNumber: 3,
        title: 'Implement core function or minimal logic',
        estimatedMinutes: 15,
        whyItWorks: 'A working prototype reduces anxiety faster than designing full architectures.',
        microAction: 'Write the primary function or UI element without edge case handling.',
        quickTip: 'Use dummy data or hardcoded values if needed.',
      },
      {
        stepNumber: 4,
        title: 'Test basic inputs & fix immediate errors',
        estimatedMinutes: 12,
        whyItWorks: 'Immediate feedback loops keep focus high.',
        microAction: 'Run your code, check console logs, and fix syntax/type errors.',
        quickTip: 'Focus on 1 error at a time.',
      },
      {
        stepNumber: 5,
        title: 'Clean up code formatting and save progress',
        estimatedMinutes: 10,
        whyItWorks: 'Wrapping up with clean code builds confidence for future tasks.',
        microAction: 'Format indentation, remove console logs, and save progress.',
        quickTip: 'Great job! Take a quick stretch break.',
      }
    ];
  } else if (lower.match(/write|essay|paper|report|article|blog|doc|draft|proposal|letter|email/)) {
    steps = [
      {
        stepNumber: 1,
        title: `Open document & type title + 3 outline headings for "${title}"`,
        estimatedMinutes: isLowEnergy ? 5 : 8,
        whyItWorks: 'Conquers blank page paralysis by putting structure on the screen in 3 minutes.',
        microAction: 'Open Google Docs or Word and type your title and 3 headings.',
        quickTip: 'Don\'t worry about perfection—just write bullet points.',
      },
      {
        stepNumber: 2,
        title: 'Gather 2 core references or key notes',
        estimatedMinutes: 10,
        whyItWorks: 'Having materials ready prevents tab-switching distractions later.',
        microAction: 'Paste 2 helpful quotes, facts, or links under your outline.',
        quickTip: 'Limit yourself to 2 tabs max.',
      },
      {
        stepNumber: 3,
        title: 'Write an "ugly" rough draft of paragraph 1',
        estimatedMinutes: 15,
        whyItWorks: 'Lowering quality standards allows words to flow without self-censorship.',
        microAction: 'Type continuously for 10 minutes without backspacing or editing.',
        quickTip: 'Use [INSERT DETAIL] if you get stuck on a fact.',
      },
      {
        stepNumber: 4,
        title: 'Draft paragraph 2 and main conclusion points',
        estimatedMinutes: 15,
        whyItWorks: 'Building on existing momentum makes writing paragraph 2 twice as easy.',
        microAction: 'Flesh out section 2 using your bullet point outline.',
        quickTip: 'Keep going—you are almost done.',
      },
      {
        stepNumber: 5,
        title: 'Read through once, fix typos, and format',
        estimatedMinutes: 10,
        whyItWorks: 'Separating drafting from editing protects creative flow.',
        microAction: 'Run spell check, fix obvious typos, and save your document.',
        quickTip: 'Celebrate finishing your draft!',
      }
    ];
  } else if (lower.match(/study|exam|test|learn|read|homework|math|physics|history|quiz/)) {
    steps = [
      {
        stepNumber: 1,
        title: `Open textbook/notes & write 3 main topics for "${title}"`,
        estimatedMinutes: isLowEnergy ? 5 : 8,
        whyItWorks: 'Defining specific study targets prevents passive scanning.',
        microAction: 'Open your notebook and write down the 3 core concepts to review.',
        quickTip: 'Keep your phone in another room.',
      },
      {
        stepNumber: 2,
        title: 'Review Topic 1 and summarize in 3 sentences',
        estimatedMinutes: 12,
        whyItWorks: 'Active recall forces the brain to digest and retain key information.',
        microAction: 'Read section 1 and write a 3-sentence summary in your own words.',
        quickTip: 'Focus on understanding, not memorizing word-for-word.',
      },
      {
        stepNumber: 3,
        title: 'Solve or answer 2 practice problems / questions',
        estimatedMinutes: 15,
        whyItWorks: 'Testing yourself builds exam confidence faster than re-reading.',
        microAction: 'Pick 2 questions from chapter end or practice quiz and attempt them.',
        quickTip: 'Check answers after completing both.',
      },
      {
        stepNumber: 4,
        title: 'Review Topic 2 and note tricky formulas/terms',
        estimatedMinutes: 12,
        whyItWorks: 'Targeting weak spots yields maximum score improvement per minute.',
        microAction: 'Highlight 3 key definitions or formulas you felt unsure about.',
        quickTip: 'Write flashcards for difficult terms.',
      },
      {
        stepNumber: 5,
        title: 'Do a 5-minute active recall summary',
        estimatedMinutes: 8,
        whyItWorks: 'Consolidates short-term memory before taking a break.',
        microAction: 'Close notes and speak or write out 3 things you learned.',
        quickTip: 'Awesome study session complete!',
      }
    ];
  } else {
    steps = [
      {
        stepNumber: 1,
        title: `Set up scratchpad & write 3 quick bullets for "${title}"`,
        estimatedMinutes: isLowEnergy ? 5 : 8,
        whyItWorks: 'Eliminates blank page syndrome by lowering the bar to zero-judgment bullet points.',
        microAction: 'Open a blank document or notebook and type the title at the top.',
        quickTip: 'Don\'t edit or format. Just write raw thoughts.',
      },
      {
        stepNumber: 2,
        title: 'Gather core materials, links, or tools',
        estimatedMinutes: 10,
        whyItWorks: 'Removes tool-hunting friction so focus isn\'t interrupted later.',
        microAction: 'Find 2 relevant reference files or open required tabs.',
        quickTip: 'Close irrelevant apps to stay focused.',
      },
      {
        stepNumber: 3,
        title: 'Execute the first 12-minute micro-action',
        estimatedMinutes: 15,
        whyItWorks: 'Action creates motivation, not the other way around.',
        microAction: 'Work continuously on sub-task 1 for 12 minutes with zero distractions.',
        quickTip: 'Set a timer so you don\'t clock-watch.',
      },
      {
        stepNumber: 4,
        title: 'Flesh out sub-task 2 and connect key parts',
        estimatedMinutes: 15,
        whyItWorks: 'Builds momentum from Step 3\'s progress.',
        microAction: 'Add remaining details or complete the second part of the task.',
        quickTip: 'Take a 2-minute stretch break if needed.',
      },
      {
        stepNumber: 5,
        title: 'Final 8-minute review & celebratory wrap-up',
        estimatedMinutes: 8,
        whyItWorks: 'Knowing the end is in sight releases dopamine and solidifies completion.',
        microAction: 'Review final output, save files, and mark task completed.',
        quickTip: 'Celebrate taking action today!',
      }
    ];
  }

  return {
    encouragement: `Starting is 80% of the battle. You don't need to finish everything at once—just execute Step 1!`,
    firstStepNudge: `Set a 5-minute timer and start Step 1 right now. You can stop after 5 minutes if you want!`,
    steps,
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
