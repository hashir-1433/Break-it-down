import React from 'react';
import { TaskBreakdown, MicroStep } from '../types';
import { Play, CheckCircle2, Clock, Sparkles, ArrowRight, Lightbulb, Zap, Flag } from 'lucide-react';
import { motion } from 'motion/react';

interface FocusCardProps {
  breakdown: TaskBreakdown;
  onStepComplete: (stepId: string) => void;
  onLaunchTimer: (step: MicroStep) => void;
  onJumpToOverview: () => void;
}

export const FocusCard: React.FC<FocusCardProps> = ({
  breakdown,
  onStepComplete,
  onLaunchTimer,
  onJumpToOverview,
}) => {
  // Find first uncompleted step
  const activeStep = breakdown.steps.find((s) => !s.completed) || breakdown.steps[breakdown.steps.length - 1];
  const completedCount = breakdown.steps.filter((s) => s.completed).length;
  const isFullyCompleted = completedCount === breakdown.steps.length;

  if (isFullyCompleted) {
    return (
      <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-emerald-100 rounded-2xl p-8 border border-emerald-800 shadow-2xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg">
          <Flag className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          🎉 Mountain Conquered!
        </h2>
        <p className="text-emerald-200 text-sm max-w-md mx-auto">
          You completed all 5 micro-steps for <span className="font-bold text-white">"{breakdown.taskTitle}"</span>. What felt overwhelming is now DONE.
        </p>
        <button
          onClick={onJumpToOverview}
          className="px-6 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold text-sm transition-colors shadow-md inline-flex items-center gap-2"
        >
          <span>View Task Breakdown Summary</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden"
    >
      {/* Top Banner: Friction-Free Step Spotlight */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-3 text-stone-950 flex items-center justify-between gap-4 font-bold text-xs uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 fill-stone-950" />
          <span>Friction-Free Focus Mode • Step {activeStep.stepNumber} of {breakdown.steps.length}</span>
        </div>
        <div className="flex items-center gap-1 bg-stone-950/20 px-2.5 py-1 rounded-full text-[11px] font-extrabold">
          <Clock className="w-3.5 h-3.5" />
          <span>{activeStep.estimatedMinutes} Mins</span>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Task Title Header */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
            <span>Parent Objective:</span>
            <span className="text-stone-300 normal-case font-normal truncate max-w-md">{breakdown.taskTitle}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {activeStep.title}
          </h2>
        </div>

        {/* Immediate Micro Action Callout */}
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                Immediate Micro-Action (Do This Right Now)
              </div>
              <p className="text-stone-100 font-semibold text-base sm:text-lg leading-snug">
                {activeStep.microAction}
              </p>
            </div>
          </div>
        </div>

        {/* Why It Works & Quick Tip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-stone-800/80 rounded-xl p-3.5 border border-stone-700/80">
            <div className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Why This Step Works</span>
            </div>
            <p className="text-stone-300 leading-relaxed">
              {activeStep.whyItWorks}
            </p>
          </div>

          {activeStep.quickTip && (
            <div className="bg-stone-800/80 rounded-xl p-3.5 border border-stone-700/80">
              <div className="font-bold text-orange-300 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>Pro Focus Tip</span>
              </div>
              <p className="text-stone-300 leading-relaxed">
                {activeStep.quickTip}
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => onLaunchTimer(activeStep)}
            className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01]"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>Launch {activeStep.estimatedMinutes}-Min Focus Timer</span>
          </button>

          <button
            onClick={() => onStepComplete(activeStep.id)}
            className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>Done! Onward to Step {activeStep.stepNumber + 1}</span>
          </button>
        </div>

        {/* Bottom progress bar */}
        <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>Overall Progress: {completedCount} / {breakdown.steps.length} Steps Done</span>
          <button
            onClick={onJumpToOverview}
            className="text-amber-400 hover:underline font-medium"
          >
            View Full 5-Step Breakdown &rarr;
          </button>
        </div>
      </div>
    </motion.div>
  );
};
