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
      headers['x-gemini-api-key'] = customKey.trim();
    }
    return headers;
  };

  const handleCreateBreakdown = async (req: BreakdownRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();

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
    } catch (err: any) {
      console.error('Failed to generate breakdown:', err);
      setError('Could not connect to AI planner. Switched to offline backup planner!');
    } finally {
      setIsLoading(false);
    }
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
