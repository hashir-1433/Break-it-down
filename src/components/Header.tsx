import React from 'react';
import { Layers, Zap, Archive, Volume2, VolumeX, Sparkles, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'decompose' | 'focus' | 'history' | 'tips';
  setActiveTab: (tab: 'decompose' | 'focus' | 'history' | 'tips') => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  activeTaskCount: number;
  hasActiveTask: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  soundEnabled,
  setSoundEnabled,
  activeTaskCount,
  hasActiveTask,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-stone-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div 
          onClick={() => setActiveTab('decompose')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-stone-950 font-bold shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 fill-stone-950 stroke-stone-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-stone-100 group-hover:text-amber-400 transition-colors">
                Break It Down
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Micro-Planner
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              Overcome task paralysis in 20-minute action steps
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-stone-800/80 p-1 rounded-xl border border-stone-700/60">
          <button
            onClick={() => setActiveTab('decompose')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'decompose'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-300 hover:text-stone-100 hover:bg-stone-700/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Break Task</span>
          </button>

          <button
            onClick={() => setActiveTab('focus')}
            disabled={!hasActiveTask}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all relative ${
              !hasActiveTask ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              activeTab === 'focus'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-300 hover:text-stone-100 hover:bg-stone-700/50'
            }`}
            title={hasActiveTask ? 'Jump to Step 1 Focus Mode' : 'Create or select a task first'}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Focus Mode</span>
            {hasActiveTask && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all relative ${
              activeTab === 'history'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-300 hover:text-stone-100 hover:bg-stone-700/50'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Archives</span>
            {activeTaskCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-stone-700 text-amber-300 font-bold">
                {activeTaskCount}
              </span>
            )}
          </button>
        </nav>

        {/* Audio Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border ${
            soundEnabled
              ? 'bg-stone-800 text-amber-400 border-amber-500/30 hover:bg-stone-700'
              : 'bg-stone-800/60 text-stone-500 border-stone-700 hover:text-stone-300'
          }`}
          title={soundEnabled ? 'Completion Chime Enabled' : 'Chime Muted'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
