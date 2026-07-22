import React, { useState } from 'react';
import { EnergyLevel, ProcrastinationReason, BreakdownRequest } from '../types';
import { Sparkles, ArrowRight, Zap, BatteryLow, BatteryMedium, BatteryCharging, AlertCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskFormProps {
  onSubmit: (req: BreakdownRequest) => void;
  isLoading: boolean;
}

const PRESETS = [
  "Write a 2,000-word history essay",
  "Build database & tables for final project",
  "Clean and deep organize messy bedroom",
  "Prepare 10-slide quarterly presentation",
  "Organize tax documents & receipts",
  "Draft client proposal document",
];

export const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, isLoading }) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskContext, setTaskContext] = useState('');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [procrastinationReason, setProcrastinationReason] = useState<ProcrastinationReason>('overwhelmed');
  const [timeAvailable, setTimeAvailable] = useState<string>('1h');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || isLoading) return;
    onSubmit({
      taskTitle: taskTitle.trim(),
      taskContext: taskContext.trim() || undefined,
      energyLevel,
      procrastinationReason,
      timeAvailable,
    });
  };

  const handlePresetSelect = (preset: string) => {
    setTaskTitle(preset);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xl shadow-stone-200/40 p-6 sm:p-8 transition-all">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold mb-3">
          <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
          <span>Anti-Procrastination Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          What massive task is paralyzing you right now?
        </h1>
        <p className="text-stone-600 text-sm mt-1">
          Type it out. We will instantly chop it into <span className="font-semibold text-stone-900">5 bite-sized, 20-minute action steps</span> so you can just start.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Task Input */}
        <div>
          <label htmlFor="task-title-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
            The Massive Task
          </label>
          <div className="relative">
            <textarea
              id="task-title-input"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Write a 2,000-word essay on European history..."
              rows={2}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-stone-900 placeholder:text-stone-400 font-medium text-base resize-none transition-all outline-none"
              required
            />
          </div>

          {/* Quick Presets */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 font-medium mb-1.5 flex items-center gap-1">
              <span>Or pick an example to test:</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100/80 hover:text-amber-900 text-stone-700 text-xs font-medium transition-colors border border-stone-200/60"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Energy Level Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
            Your Energy Level Right Now
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setEnergyLevel('low')}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                energyLevel === 'low'
                  ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-semibold shadow-sm'
                  : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <BatteryLow className={`w-4 h-4 ${energyLevel === 'low' ? 'text-amber-600' : 'text-stone-400'}`} />
                <span className="text-xs font-bold">Low Energy</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-snug">
                Step 1 will be ultra-gentle (&lt;5 mins)
              </p>
            </button>

            <button
              type="button"
              onClick={() => setEnergyLevel('medium')}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                energyLevel === 'medium'
                  ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-semibold shadow-sm'
                  : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <BatteryMedium className={`w-4 h-4 ${energyLevel === 'medium' ? 'text-amber-600' : 'text-stone-400'}`} />
                <span className="text-xs font-bold">Moderate</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-snug">
                Balanced 10–15 min focus blocks
              </p>
            </button>

            <button
              type="button"
              onClick={() => setEnergyLevel('high')}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                energyLevel === 'high'
                  ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-semibold shadow-sm'
                  : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <BatteryCharging className={`w-4 h-4 ${energyLevel === 'high' ? 'text-amber-600' : 'text-stone-400'}`} />
                <span className="text-xs font-bold">High Energy</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-snug">
                Power through with crisp micro-sprints
              </p>
            </button>
          </div>
        </div>

        {/* Procrastination Trigger Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
            Why are you avoiding this task?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'overwhelmed', label: '🤯 Overwhelmed', desc: 'Too big or ambiguous' },
              { id: 'perfectionism', label: '🎨 Perfectionism', desc: 'Afraid of failure' },
              { id: 'boredom', label: '🥱 Boring / Dry', desc: 'Lack of motivation' },
              { id: 'friction', label: '🚧 Tool Friction', desc: 'Setup feels annoying' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setProcrastinationReason(item.id as ProcrastinationReason)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  procrastinationReason === item.id
                    ? 'border-amber-500 bg-amber-500/10 text-stone-900 font-bold ring-1 ring-amber-500'
                    : 'border-stone-200 bg-stone-50/60 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="text-xs font-semibold">{item.label}</div>
                <div className="text-[10px] text-stone-500 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Advanced Options */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-stone-600 hover:text-amber-700 flex items-center gap-1 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showAdvanced ? 'Hide additional context' : 'Add extra context or deadline details'}</span>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3 space-y-4 pt-2 border-t border-stone-100"
              >
                <div>
                  <label htmlFor="task-context-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Specific Requirements or Constraints
                  </label>
                  <input
                    id="task-context-input"
                    type="text"
                    value={taskContext}
                    onChange={(e) => setTaskContext(e.target.value)}
                    placeholder="e.g. Must use React and Express; due in 3 hours"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-200 text-xs text-stone-900 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="time-budget-select" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Total Time Budget
                  </label>
                  <select
                    id="time-budget-select"
                    value={timeAvailable}
                    onChange={(e) => setTimeAvailable(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:border-amber-500 outline-none bg-white"
                  >
                    <option value="30m">30 minutes max (Ultra fast focus)</option>
                    <option value="1h">1 hour total (Recommended)</option>
                    <option value="2h">2 hours total</option>
                    <option value="flexible">Flexible / Spread over today</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!taskTitle.trim() || isLoading}
          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-extrabold text-base tracking-tight shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          {isLoading ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin text-stone-950" />
              <span>Fragmenting into 5 micro-steps...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 fill-stone-950" />
              <span>Break It Down Into 5 Action Steps</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
