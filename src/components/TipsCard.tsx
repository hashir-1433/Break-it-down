import React from 'react';
import { Lightbulb, Zap, ShieldAlert, Sparkles, Target, Compass } from 'lucide-react';

export const TipsCard: React.FC = () => {
  const TIPS = [
    {
      icon: Zap,
      title: 'The 5-Minute Rule',
      desc: 'Tell yourself you will only work on Step 1 for 5 minutes. If you want to quit after 5 minutes, you have total permission. 80% of the time, overcoming startup inertia keeps you going.',
      color: 'amber',
    },
    {
      icon: ShieldAlert,
      title: 'Zero-Judgment Drafts',
      desc: 'Perfectionism is procrastination in a fancy coat. Write ugly, broken sentences or place [TODO] markers. A terrible draft can be fixed; a blank page cannot.',
      color: 'orange',
    },
    {
      icon: Target,
      title: 'Parkinson\'s Law Sprints',
      desc: 'Work expands to fill the time allotted. By setting strict 15 or 20-minute countdown timers, your brain focuses purely on execution rather than perfection.',
      color: 'emerald',
    },
    {
      icon: Compass,
      title: 'Action Creates Motivation',
      desc: 'Motivation rarely comes before action. It is a side-effect of taking the first micro-step. Motion generates emotion.',
      color: 'indigo',
    },
  ];

  return (
    <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-7 border border-stone-800 shadow-xl space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-extrabold text-white tracking-tight">
          Psychological Anti-Procrastination Toolkit
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {TIPS.map((tip) => {
          const Icon = tip.icon;
          return (
            <div key={tip.title} className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/80 space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{tip.title}</span>
              </div>
              <p className="text-stone-300 leading-relaxed">
                {tip.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
