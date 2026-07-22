import React, { useState, useEffect, useRef } from 'react';
import { MicroStep } from '../types';
import { Play, Pause, RotateCcw, Plus, CheckCircle2, X, Volume2, VolumeX, Sparkles, Zap, Flame } from 'lucide-react';
import { playStepCompleteSound, playTimerStartSound } from '../lib/sound';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

interface FocusTimerModalProps {
  step: MicroStep;
  soundEnabled: boolean;
  onClose: () => void;
  onCompleteStep: (stepId: string) => void;
}

const QUOTES = [
  "Action creates momentum, not thought.",
  "You don't have to feel like it. Just do 2 minutes.",
  "Done is infinitely better than perfect.",
  "Lower the bar until it's impossible to fail.",
  "The secret of getting ahead is getting started.",
  "Future You will be thrilled you did this.",
];

export const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  step,
  soundEnabled,
  onClose,
  onCompleteStep,
}) => {
  const initialSeconds = (step.estimatedMinutes || 15) * 60;
  const [totalSeconds, setTotalSeconds] = useState<number>(initialSeconds);
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Rotate quotes
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 12000);
    return () => clearInterval(quoteInterval);
  }, []);

  // Play start sound on mount
  useEffect(() => {
    playTimerStartSound(soundEnabled);
  }, []);

  // Timer interval countdown
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsFinished(true);
            playStepCompleteSound(soundEnabled);
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, soundEnabled]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const addFiveMinutes = () => {
    setTimeLeft((prev) => prev + 300);
    setTotalSeconds((prev) => prev + 300);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(initialSeconds);
    setTotalSeconds(initialSeconds);
    setIsFinished(false);
  };

  const handleFinishStep = () => {
    playStepCompleteSound(soundEnabled);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    onCompleteStep(step.id);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 100;
  const strokeDashoffset = 283 - (283 * progressPercent) / 100;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-lg flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 text-stone-100 shadow-2xl relative space-y-6"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-stone-800/80 text-stone-400 hover:text-stone-100 hover:bg-stone-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Step {step.stepNumber} Focus Sprint
          </span>
        </div>

        {/* Title & Micro Action */}
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {step.title}
          </h3>
          <div className="mt-2.5 p-3.5 rounded-xl bg-stone-800/80 border border-stone-700/80 text-xs text-amber-200 flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-400">Micro-Action: </span>
              <span>{step.microAction}</span>
            </div>
          </div>
        </div>

        {/* Main Circular Timer */}
        <div className="relative py-4 flex flex-col items-center justify-center">
          <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
            {/* Background pulse glow when running */}
            {isRunning && (
              <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping opacity-30" />
            )}

            {/* SVG Progress Circle */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r="45"
                className="text-stone-800 stroke-current"
                strokeWidth="6"
                fill="transparent"
              />
              {/* Active Progress */}
              <circle
                cx="50"
                cy="50"
                r="45"
                className="text-amber-500 stroke-current transition-all duration-1000 ease-linear"
                strokeWidth="6"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Time Display */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest mt-1">
                {isFinished ? 'Time Complete!' : isRunning ? 'In Focus Sprint' : 'Paused'}
              </span>
            </div>
          </div>
        </div>

        {/* Motivational Quote Banner */}
        <div className="p-3 bg-stone-800/50 rounded-xl text-center text-xs text-stone-300 italic border border-stone-800 min-h-[44px] flex items-center justify-center">
          <span>"{QUOTES[quoteIndex]}"</span>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleTimer}
              className={`flex-1 py-3.5 px-5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                isRunning
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{timeLeft < totalSeconds ? 'Resume' : 'Start Focus'}</span>
                </>
              )}
            </button>

            <button
              onClick={addFiveMinutes}
              className="py-3.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center gap-1 border border-stone-700 transition-colors"
              title="Add 5 Minutes"
            >
              <Plus className="w-4 h-4" />
              <span>+5m</span>
            </button>

            <button
              onClick={resetTimer}
              className="p-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 border border-stone-700 transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleFinishStep}
            className="w-full py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01]"
          >
            <CheckCircle2 className="w-5 h-5 text-stone-950" />
            <span>Mark Step Completed</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
