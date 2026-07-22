/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TaskBreakdown, MicroStep, BreakdownRequest } from './types';
import {
  getSavedBreakdowns,
  saveBreakdown,
  getActiveBreakdownId,
  setActiveBreakdownId,
  deleteBreakdown,
  updateStepInBreakdown,
  addCustomStepToBreakdown,
} from './lib/storage';
import { Header } from './components/Header';
import { TaskForm } from './components/TaskForm';
import { FocusCard } from './components/FocusCard';
import { StepList } from './components/StepList';
import { HistoryView } from './components/HistoryView';
import { FocusTimerModal } from './components/FocusTimerModal';
import { TipsCard } from './components/TipsCard';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Sparkles, Layers, ListChecks } from 'lucide-react';

function generateClientFallbackBreakdown(title: string, energy: string = 'medium', reason: string = 'overwhelmed') {
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'decompose' | 'focus' | 'history'>('decompose');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [savedTasks, setSavedTasks] = useState<TaskBreakdown[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTimerStep, setActiveTimerStep] = useState<MicroStep | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved tasks on initial render
  useEffect(() => {
    const list = getSavedBreakdowns();
    setSavedTasks(list);
    const activeId = getActiveBreakdownId() || list[0]?.id || null;
    setActiveTaskId(activeId);
  }, []);

  const activeTask = savedTasks.find((t) => t.id === activeTaskId) || null;

  const getHeaders = () => {
    const customKey = localStorage.getItem('user_gemini_key');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey && customKey.trim()) {
      const key = customKey.trim();
      if (key.startsWith('AIzaSy') || key.startsWith('sk-or-')) {
        headers['x-gemini-api-key'] = key;
      } else {
        localStorage.removeItem('user_gemini_key');
      }
    }
    return headers;
  };

  const handleCreateBreakdown = async (req: BreakdownRequest) => {
    setIsLoading(true);
    setError(null);

    let data: any = null;

    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(req),
      });

      if (res.ok) {
        data = await res.json();
      } else {
        console.warn(`Server returned status ${res.status}`);
      }
    } catch (err: any) {
      console.error('Failed to connect to backend AI service:', err);
    }

    if (!data || !data.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
      data = generateClientFallbackBreakdown(req.taskTitle, req.energyLevel, req.procrastinationReason);
      setError('Used offline micro-planner to break down your task!');
    }

    const newSteps: MicroStep[] = (data.steps || []).map((s: any, idx: number) => ({
      id: `step_${Date.now()}_${idx}`,
      stepNumber: s.stepNumber || idx + 1,
      title: s.title || `Action Step ${idx + 1}`,
      estimatedMinutes: s.estimatedMinutes || 10,
      whyItWorks: s.whyItWorks || 'Breaking tasks down reduces mental fatigue.',
      microAction: s.microAction || 'Set a timer and take the first action.',
      quickTip: s.quickTip || '',
      completed: false,
    }));

    const newBreakdown: TaskBreakdown = {
      id: `task_${Date.now()}`,
      taskTitle: req.taskTitle,
      taskContext: req.taskContext,
      energyLevel: req.energyLevel || 'medium',
      procrastinationReason: req.procrastinationReason,
      timeAvailable: req.timeAvailable,
      steps: newSteps,
      encouragement: data.encouragement,
      firstStepNudge: data.firstStepNudge,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    };

    saveBreakdown(newBreakdown);
    setSavedTasks(getSavedBreakdowns());
    setActiveTaskId(newBreakdown.id);

    // Instantly open Focus Mode so user takes Step 1 right away!
    setActiveTab('focus');
    setIsLoading(false);
  };

  const handleStepComplete = (stepId: string) => {
    if (!activeTask) return;
    const step = activeTask.steps.find((s) => s.id === stepId);
    if (!step) return;

    const updated = updateStepInBreakdown(activeTask.id, stepId, {
      completed: !step.completed,
      completedAt: !step.completed ? new Date().toISOString() : undefined,
    });

    if (updated) {
      setSavedTasks(getSavedBreakdowns());
    }
  };

  const handleUpdateStepDetails = (stepId: string, updates: Partial<MicroStep>) => {
    if (!activeTask) return;
    const updated = updateStepInBreakdown(activeTask.id, stepId, updates);
    if (updated) {
      setSavedTasks(getSavedBreakdowns());
    }
  };

  const handleAddCustomStep = (newStep: Omit<MicroStep, 'id' | 'stepNumber' | 'completed'>) => {
    if (!activeTask) return;
    const updated = addCustomStepToBreakdown(activeTask.id, newStep);
    if (updated) {
      setSavedTasks(getSavedBreakdowns());
    }
  };

  const handleRegenerateStep = async (stepNumber: number, currentTitle: string) => {
    if (!activeTask) return;

    try {
      const res = await fetch('/api/regenerate-step', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          taskTitle: activeTask.taskTitle,
          stepNumber,
          currentStepTitle: currentTitle,
          allStepsTitles: activeTask.steps.map((s) => s.title),
        }),
      });

      const newStepData = await res.json();
      const targetStep = activeTask.steps.find((s) => s.stepNumber === stepNumber);

      if (targetStep && newStepData.title) {
        handleUpdateStepDetails(targetStep.id, {
          title: newStepData.title,
          estimatedMinutes: newStepData.estimatedMinutes || targetStep.estimatedMinutes,
          whyItWorks: newStepData.whyItWorks || targetStep.whyItWorks,
          microAction: newStepData.microAction || targetStep.microAction,
          quickTip: newStepData.quickTip || targetStep.quickTip,
        });
      }
    } catch (err) {
      console.error('Failed to regenerate step:', err);
    }
  };

  const handleDeleteBreakdown = (id: string) => {
    const updatedList = deleteBreakdown(id);
    setSavedTasks(updatedList);
    setActiveTaskId(updatedList[0]?.id || null);
    if (updatedList.length === 0) {
      setActiveTab('decompose');
    }
  };

  const handleSelectTask = (task: TaskBreakdown) => {
    setActiveTaskId(task.id);
    setActiveBreakdownId(task.id);
    setActiveTab('focus');
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans selection:bg-amber-200 flex flex-col">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        activeTaskCount={savedTasks.filter((t) => t.status === 'active').length}
        hasActiveTask={!!activeTask}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Banner Alert for Errors */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="font-bold underline hover:text-amber-950"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Content rendering */}
        <AnimatePresence mode="wait">
          {activeTab === 'decompose' && (
            <motion.div
              key="decompose"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <TaskForm onSubmit={handleCreateBreakdown} isLoading={isLoading} />
              <TipsCard />
            </motion.div>
          )}

          {activeTab === 'focus' && (
            <motion.div
              key="focus"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {activeTask ? (
                <>
                  {/* Focus Card (Spotlight on Step 1 / Current Step) */}
                  <FocusCard
                    breakdown={activeTask}
                    onStepComplete={handleStepComplete}
                    onLaunchTimer={(step) => setActiveTimerStep(step)}
                    onJumpToOverview={() => {
                      const el = document.getElementById('full-breakdown-list');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />

                  {/* Full 5-Step Checklist Overview */}
                  <div id="full-breakdown-list" className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <ListChecks className="w-5 h-5 text-amber-700" />
                      <h2 className="text-xl font-extrabold text-stone-900">
                        Full 5-Step Action Breakdown
                      </h2>
                    </div>

                    <StepList
                      breakdown={activeTask}
                      soundEnabled={soundEnabled}
                      onUpdateStep={handleUpdateStepDetails}
                      onAddStep={handleAddCustomStep}
                      onRegenerateStep={handleRegenerateStep}
                      onLaunchTimer={(step) => setActiveTimerStep(step)}
                      onDeleteBreakdown={handleDeleteBreakdown}
                    />
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-stone-900">No active task selected</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Enter a massive task on the main screen to generate your 5-step micro-plan.
                  </p>
                  <button
                    onClick={() => setActiveTab('decompose')}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs inline-flex items-center gap-2"
                  >
                    <span>Create New Task Breakdown</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HistoryView
                tasks={savedTasks}
                onSelectTask={handleSelectTask}
                onDeleteTask={handleDeleteBreakdown}
                onNewTaskClick={() => setActiveTab('decompose')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Focus Timer Modal */}
      <AnimatePresence>
        {activeTimerStep && (
          <FocusTimerModal
            step={activeTimerStep}
            soundEnabled={soundEnabled}
            onClose={() => setActiveTimerStep(null)}
            onCompleteStep={(stepId) => {
              handleStepComplete(stepId);
              setActiveTimerStep(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white/50 text-stone-500 py-6 text-center text-xs space-y-1 mt-auto">
        <p className="font-medium text-stone-600">
          Break It Down — Anti-Procrastination Task Micro-Planner
        </p>
        <p className="text-[11px] text-stone-400">
          Built with Gemini AI • Take action in 20-minute micro-sprints
        </p>
      </footer>
    </div>
  );
}
