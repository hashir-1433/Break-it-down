import React, { useState } from 'react';
import { TaskBreakdown } from '../types';
import { Archive, CheckCircle2, Clock, ArrowRight, Trash2, Zap, Sparkles } from 'lucide-react';

interface HistoryViewProps {
  tasks: TaskBreakdown[];
  onSelectTask: (task: TaskBreakdown) => void;
  onDeleteTask: (id: string) => void;
  onNewTaskClick: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  tasks,
  onSelectTask,
  onDeleteTask,
  onNewTaskClick,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return t.status === 'active';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-md p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Saved Archives</span>
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Your Broken Down Mountains
          </h2>
          <p className="text-stone-600 text-xs mt-0.5">
            Access past micro-plans, pick up where you left off, or review conquered goals.
          </p>
        </div>

        <button
          onClick={onNewTaskClick}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 fill-stone-950" />
          <span>Break New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors capitalize ${
              filter === f
                ? 'bg-stone-900 text-stone-100'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            {f} ({tasks.filter((t) => (f === 'all' ? true : f === 'active' ? t.status === 'active' : t.status === 'completed')).length})
          </button>
        ))}
      </div>

      {/* Task Grid */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-stone-800">No tasks found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {filter === 'all'
              ? 'You haven\'t broken down any tasks yet. Type a big goal to generate your first 5-step plan!'
              : `No ${filter} tasks matching your selection.`}
          </p>
          <button
            onClick={onNewTaskClick}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs inline-flex items-center gap-1.5"
          >
            <span>Start First Breakdown</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const completedCount = task.steps.filter((s) => s.completed).length;
            const totalCount = task.steps.length;
            const isDone = completedCount === totalCount;

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl border border-stone-200/80 hover:border-amber-400 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {isDone ? 'Completed' : 'In Progress'}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3
                    onClick={() => onSelectTask(task)}
                    className="text-base font-bold text-stone-900 group-hover:text-amber-700 cursor-pointer transition-colors line-clamp-2"
                  >
                    {task.taskTitle}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-stone-500 pt-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{completedCount}/{totalCount} Steps</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span className="capitalize">{task.energyLevel} Energy</span>
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                  <button
                    onClick={() => onSelectTask(task)}
                    className="text-xs font-bold text-amber-700 group-hover:text-amber-800 flex items-center gap-1"
                  >
                    <span>Open Micro-Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
