import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to extract key and type
const getKeyAndProvider = (req?: express.Request) => {
  const apiKey = (req?.headers['x-gemini-api-key'] as string) || (req?.body?.apiKey as string) || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) return { apiKey: null, provider: null };
  const trimmed = apiKey.trim();
  if (trimmed.startsWith('gsk_')) return { apiKey: trimmed, provider: 'groq' };
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

// Helper to handle Groq API calls
async function callGroq(apiKey: string, systemInstruction: string, userPrompt: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemInstruction + '\n\nIMPORTANT: You MUST respond strictly in valid raw JSON matching the requested structure. Do NOT include markdown code blocks (no ```json).' },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '{}';
  const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}

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

// Helper to detect casual chat like "hi", "how are you", "what's up", etc.
function isCasualChatInput(title: string): boolean {
  if (!title || typeof title !== 'string') return true;
  const clean = title.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  if (!clean || clean.length < 2) return true;

  const EXACT_CHATTERS = new Set([
    'hi', 'hello', 'hey', 'heyy', 'heyyy', 'yo', 'sup', 'whats up', 'whatsup',
    'how are you', 'how are u', 'how r u', 'hru', 'hows it going', 'how do you do',
    'good morning', 'good afternoon', 'good evening', 'good night',
    'who are you', 'who r u', 'what are you', 'what is this', 'test', 'testing',
    'hi there', 'hello there', 'bye', 'goodbye', 'thanks', 'thank you', 'thx',
    'tell me a joke', 'what is your name', 'whats your name', 'are you ai',
    'can we talk', 'say something', 'ok', 'okay', 'cool', 'nice', 'haha', 'lol'
  ]);

  if (EXACT_CHATTERS.has(clean)) return true;

  const words = clean.split(' ');
  const GREETING_STARTS = ['hi', 'hello', 'hey', 'yo', 'sup', 'hru', 'whats', 'how', 'who'];

  if (words.length <= 5 && GREETING_STARTS.includes(words[0])) {
    const TASK_VERBS = [
      'clean', 'write', 'build', 'study', 'code', 'organize', 'prepare', 'fix',
      'draft', 'make', 'create', 'finish', 'wash', 'buy', 'pay', 'plan', 'review',
      'send', 'email', 'file', 'read', 'learn', 'practice', 'design', 'update',
      'setup', 'install', 'configure', 'solve', 'complete', 'workout', 'cook', 'do'
    ];
    const hasTaskVerb = words.some(w => TASK_VERBS.includes(w));
    if (!hasTaskVerb) return true;
  }

  return false;
}

// Helper to normalize breakdown responses into the exact frontend schema
function normalizeBreakdownResponse(data: any, taskTitle: string) {
  if (!data || typeof data !== 'object') {
    data = {};
  }

  let stepsRaw = data.steps || data.micro_steps || data.microSteps || data.items || data.task_breakdown || data.taskSteps || [];
  
  if (!Array.isArray(stepsRaw)) {
    if (stepsRaw && typeof stepsRaw === 'object') {
      stepsRaw = Object.values(stepsRaw);
    } else {
      stepsRaw = [];
    }
  }

  const steps = stepsRaw.map((s: any, idx: number) => {
    return {
      stepNumber: Number(s.stepNumber || s.step_number || s.number || idx + 1),
      title: String(s.title || s.step_title || s.action || `Step ${idx + 1} for ${taskTitle}`),
      estimatedMinutes: Number(s.estimatedMinutes || s.estimated_minutes || s.duration || s.minutes || 10),
      whyItWorks: String(s.whyItWorks || s.why_it_works || s.reason || s.psychology || 'Reduces cognitive friction and builds momentum.'),
      microAction: String(s.microAction || s.micro_action || s.action_item || s.first_step || 'Set a timer and execute this single action.'),
      quickTip: String(s.quickTip || s.quick_tip || s.tip || s.note || 'Focus on progress over perfection.'),
    };
  });

  if (steps.length === 0) {
    for (let i = 1; i <= 5; i++) {
      steps.push({
        stepNumber: i,
        title: `Step ${i}: Action item for ${taskTitle}`,
        estimatedMinutes: 10,
        whyItWorks: 'Breaking tasks into small steps prevents overwhelm.',
        microAction: `Focus for 10 minutes on part ${i} of ${taskTitle}.`,
        quickTip: 'Take it one step at a time.',
      });
    }
  }

  return {
    encouragement: String(data.encouragement || data.motivation || data.overall_encouragement || `Starting is 80% of the battle. You've got this!`),
    firstStepNudge: String(data.firstStepNudge || data.first_step_nudge || data.nudge || `Set a 5-minute timer and start Step 1 right now!`),
    steps,
  };
}

// API Route: Break down task into 5 micro-steps
app.post('/api/breakdown', async (req, res) => {
  try {
    const { taskTitle, taskContext, energyLevel = 'medium', procrastinationReason = 'overwhelmed', timeAvailable = '1h' } = req.body;

    if (!taskTitle || typeof taskTitle !== 'string' || !taskTitle.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    if (isCasualChatInput(taskTitle)) {
      return res.status(400).json({
        isCasualChat: true,
        error: 'Casual chat (like "hi" or "how are you") is ignored! Break It Down only processes actionable tasks (e.g., "Clean bedroom", "Write history essay", "Fix database bug").',
      });
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

JSON OUTPUT STRUCTURE REQUIREMENT:
You MUST output a JSON object strictly adhering to this schema:
{
  "encouragement": "1-sentence motivational boost",
  "firstStepNudge": "1-sentence actionable nudge for Step 1",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Short step title",
      "estimatedMinutes": 10,
      "whyItWorks": "1-sentence psychological reason",
      "microAction": "Literal micro action",
      "quickTip": "Pro tip"
    }
  ]
}
`;

    const userPrompt = `Task to break down: "${taskTitle}"
${taskContext ? `Additional Context/Details: "${taskContext}"` : ''}

Decompose this into 5 chronological, actionable micro-steps. Also provide a brief 1-sentence overall encouragement and a 1-sentence nudge for Step 1.`;

    if (provider === 'groq' && apiKey) {
      const groqRaw = await callGroq(apiKey, systemInstruction, userPrompt);
      const normalized = normalizeBreakdownResponse(groqRaw, taskTitle);
      return res.json(normalized);
    }

    if (provider === 'openrouter' && apiKey) {
      const openRouterRaw = await callOpenRouter(apiKey, systemInstruction, userPrompt);
      const normalized = normalizeBreakdownResponse(openRouterRaw, taskTitle);
      return res.json(normalized);
    }

    const ai = getGeminiClient(req);

    if (!ai) {
      return res.status(400).json({
        error: 'No valid AI API Key configured. Please ensure process.env.GEMINI_API_KEY is set or provide a custom Gemini/Groq/OpenRouter API key.',
      });
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
                  title: { type: Type.STRING, description: 'Short, clear action title' },
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
    const normalized = normalizeBreakdownResponse(parsedData, taskTitle);

    return res.json(normalized);
  } catch (error: any) {
    console.error('Error in /api/breakdown:', error?.message || error);
    return res.status(500).json({
      error: `AI generation failed: ${error?.message || 'Unable to connect to AI model'}. Please check your API key and try again.`,
    });
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

    if (provider === 'groq' && apiKey) {
      const groqResult = await callGroq(apiKey, systemInstruction, prompt);
      return res.json(groqResult);
    }

    if (provider === 'openrouter' && apiKey) {
      const openRouterResult = await callOpenRouter(apiKey, systemInstruction, prompt);
      return res.json(openRouterResult);
    }

    const ai = getGeminiClient(req);
    if (!ai) {
      return res.status(400).json({ error: 'AI service key is missing or invalid. Please provide a valid API key.' });
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
