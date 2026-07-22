import React, { useState } from 'react';
import { TaskBreakdown, MicroStep } from '../types';
import { 
  CheckCircle2, Circle, Clock, Play, Sparkles, RefreshCw, 
  ChevronDown, ChevronUp, Edit2, Check, Plus, Trash2, 
  Copy, Download, Lightbulb, Zap, Share2, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { playStepCompleteSound, playTaskCompleteSound } from '../lib/sound';

interface StepListProps {
  breakdown: TaskBreakdown;
  soundEnabled: boolean;
  onUpdateStep: (stepId: string, updates: Partial<MicroStep>) => void;
  onAddStep: (step: Omit<MicroStep, 'id' | 'stepNumber' | 'completed'>) => void;
  onRegenerateStep: (stepNumber: number, currentTitle: string) => Promise<void>;
  onLaunchTimer: (step: MicroStep) => void;
  onDeleteBreakdown: (id: string) => void;
}

export const StepList: React.FC<StepListProps> = ({
  breakdown,
  soundEnabled,
  onUpdateStep,
  onAddStep,
  onRegenerateStep,
  onLaunchTimer,
  onDeleteBreakdown,
}) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(breakdown.steps[0]?.id || null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New step form state
  const [newTitle, setNewTitle] = useState('');
  const [newMinutes, setNewMinutes] = useState(10);
  const [newAction, setNewAction] = useState('');

  const completedCount = breakdown.steps.filter((s) => s.completed).length;
  const totalCount = breakdown.steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalRemainingMinutes = breakdown.steps
    .filter((s) => !s.completed)
    .reduce((acc, curr) => acc + (curr.estimatedMinutes || 10), 0);

  const handleToggleComplete = (step: MicroStep) => {
    const nextCompleted = !step.completed;
    onUpdateStep(step.id, {
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : undefined,
    });

    if (nextCompleted) {
      if (completedCount + 1 === totalCount) {
        playTaskCompleteSound(soundEnabled);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      } else {
        playStepCompleteSound(soundEnabled);
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      }
    }
  };

  const startEdit = (step: MicroStep) => {
    setEditingStepId(step.id);
    setEditTitle(step.title);
  };

  const saveEdit = (stepId: string) => {
    if (editTitle.trim()) {
      onUpdateStep(stepId, { title: editTitle.trim() });
    }
    setEditingStepId(null);
  };

  const handleReRoll = async (step: MicroStep) => {
    setIsRegenerating(step.stepNumber);
    await onRegenerateStep(step.stepNumber, step.title);
    setIsRegenerating(null);
  };

  const handleAddStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddStep({
      title: newTitle.trim(),
      estimatedMinutes: newMinutes,
      microAction: newAction.trim() || 'Set a timer and execute.',
      whyItWorks: 'Custom step added to bridge progress.',
      quickTip: '',
    });
    setNewTitle('');
    setNewAction('');
    setShowAddForm(false);
  };

  const copyAsText = () => {
    const text = `Task: ${breakdown.taskTitle}\n\nMicro-Steps Checklist:\n` +
      breakdown.steps
        .map((s) => `${s.completed ? '[x]' : '[ ]'} Step ${s.stepNumber}: ${s.title} (${s.estimatedMinutes}m)\n   Action: ${s.microAction}`)
        .join('\n\n');

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const downloadMarkdown = () => {
    const content = `# Break It Down: ${breakdown.taskTitle}\n\n` +
      `**Status**: ${progressPercent}% completed | **Remaining Time**: ~${totalRemainingMinutes} mins\n\n` +
      `## 5-Step Action Plan\n\n` +
      breakdown.steps
        .map((s) => `- [${s.completed ? 'x' : ' '}] **Step ${s.stepNumber}: ${s.title}** (${s.estimatedMinutes} mins)\n  - *Micro-Action*: ${s.microAction}\n  - *Why It Works*: ${s.whyItWorks}`)
        .join('\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breakdown-${breakdown.taskTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card Header */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-md p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Action Plan
              </span>
              <span className="text-xs text-stone-400">
                Created {new Date(breakdown.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {breakdown.taskTitle}
            </h1>
            {breakdown.encouragement && (
              <p className="text-xs sm:text-sm text-stone-600 mt-1 italic">
                "{breakdown.encouragement}"
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyAsText}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Copy checklist as plain text"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedText ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={downloadMarkdown}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Export Markdown file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              onClick={() => onDeleteBreakdown(breakdown.id)}
              className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Metrics Bar */}
        <div className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <div className="flex justify-between text-xs font-bold text-stone-700 mb-1.5">
              <span>Completion Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-stone-100 overflow-hidden border border-stone-200/60 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="text-xs text-stone-600 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-stone-900">{totalRemainingMinutes} Mins Left</div>
              <div className="text-[11px] text-stone-500">
                {completedCount} of {totalCount} steps done
              </div>
            </div>
          </div>

          <div className="text-xs text-stone-600 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-stone-900">Anti-Procrastination</div>
              <div className="text-[11px] text-stone-500 capitalize">
                {breakdown.procrastinationReason || 'Overwhelmed'} Mode
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Cards List */}
      <div className="space-y-3">
        {breakdown.steps.map((step) => {
          const isExpanded = expandedStepId === step.id;
          const isEditing = editingStepId === step.id;

          return (
            <motion.div
              key={step.id}
              layout
              className={`bg-white rounded-2xl border transition-all ${
                step.completed
                  ? 'border-emerald-200/80 bg-emerald-50/20'
                  : isExpanded
                  ? 'border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                  : 'border-stone-200/80 hover:border-stone-300'
              }`}
            >
              {/* Step Summary Bar */}
              <div className="p-4 sm:p-5 flex items-start gap-3.5">
                {/* Complete Checkbox */}
                <button
                  onClick={() => handleToggleComplete(step)}
                  className="mt-0.5 shrink-0 transition-transform active:scale-95"
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Circle className="w-6 h-6 text-stone-300 hover:text-amber-500" />
                  )}
                </button>

                {/* Step Title & Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-xs font-black uppercase px-2 py-0.5 rounded-md ${
                        step.completed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      Step {step.stepNumber}
                    </span>
                    <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{step.estimatedMinutes}m</span>
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-amber-500 text-sm font-semibold text-stone-900 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => saveEdit(step.id)}
                        className="p-1.5 rounded-lg bg-amber-500 text-stone-950 hover:bg-amber-400"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h3
                      onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                      className={`text-base sm:text-lg font-bold cursor-pointer transition-colors ${
                        step.completed
                          ? 'line-through text-stone-400'
                          : 'text-stone-900 hover:text-amber-800'
                      }`}
                    >
                      {step.title}
                    </h3>
                  )}

                  {/* Immediate Action Preview */}
                  {!isExpanded && step.microAction && (
                    <p className="text-xs text-stone-500 truncate mt-1">
                      <span className="font-semibold text-stone-700">Action: </span>
                      {step.microAction}
                    </p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  {!step.completed && (
                    <button
                      onClick={() => onLaunchTimer(step)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold flex items-center gap-1 transition-all shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-stone-950" />
                      <span className="hidden sm:inline">Timer</span>
                    </button>
                  )}

                  <button
                    onClick={() => startEdit(step)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                    title="Edit Step Title"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Card Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-stone-100 px-5 py-4 bg-stone-50/50 space-y-3 text-xs"
                  >
                    {/* Micro Action Box */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-0.5">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>Immediate Micro-Action</span>
                      </div>
                      <p className="text-stone-800 font-medium">{step.microAction}</p>
                    </div>

                    {/* Why It Works & Quick Tip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-white p-3 rounded-xl border border-stone-200">
                        <div className="font-bold text-stone-800 flex items-center gap-1 mb-0.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          <span>Why This Step Works</span>
                        </div>
                        <p className="text-stone-600">{step.whyItWorks}</p>
                      </div>

                      {step.quickTip && (
                        <div className="bg-white p-3 rounded-xl border border-stone-200">
                          <div className="font-bold text-stone-800 flex items-center gap-1 mb-0.5">
                            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                            <span>Pro Tip</span>
                          </div>
                          <p className="text-stone-600">{step.quickTip}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        onClick={() => handleReRoll(step)}
                        disabled={isRegenerating === step.stepNumber}
                        className="text-amber-800 hover:text-amber-950 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating === step.stepNumber ? 'animate-spin' : ''}`} />
                        <span>{isRegenerating === step.stepNumber ? 'Re-rolling...' : 'Re-roll this step'}</span>
                      </button>

                      {!step.completed && (
                        <button
                          onClick={() => onLaunchTimer(step)}
                          className="text-stone-800 font-bold hover:underline flex items-center gap-1"
                        >
                          <span>Start {step.estimatedMinutes}m Focus Timer</span>
                          <span>&rarr;</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Add Custom Step Section */}
      <div className="pt-2">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-stone-300 hover:border-amber-500 text-stone-600 hover:text-amber-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Micro-Step</span>
          </button>
        ) : (
          <form onSubmit={handleAddStepSubmit} className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">Add Extra Micro-Step</h4>
            <div>
              <input
                type="text"
                placeholder="Step title (e.g., Proofread introduction paragraph)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:border-amber-500 outline-none"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Micro-action (e.g., Open document and read aloud)"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:border-amber-500 outline-none"
              />
              <select
                value={newMinutes}
                onChange={(e) => setNewMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:border-amber-500 outline-none bg-white"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
              >
                Add Step
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
