import { TaskBreakdown, MicroStep } from '../types';

const STORAGE_KEY = 'break_it_down_tasks_v1';
const ACTIVE_KEY = 'break_it_down_active_id';

export function getSavedBreakdowns(): TaskBreakdown[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: TaskBreakdown[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse localStorage breakdowns:', err);
    return [];
  }
}

export function saveBreakdown(breakdown: TaskBreakdown): void {
  if (typeof window === 'undefined') return;
  const list = getSavedBreakdowns();
  const existingIndex = list.findIndex((b) => b.id === breakdown.id);

  if (existingIndex >= 0) {
    list[existingIndex] = { ...breakdown, updatedAt: new Date().toISOString() };
  } else {
    list.unshift(breakdown);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    setActiveBreakdownId(breakdown.id);
  } catch (err) {
    console.error('Failed to save breakdown to localStorage:', err);
  }
}

export function getActiveBreakdownId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveBreakdownId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function deleteBreakdown(id: string): TaskBreakdown[] {
  if (typeof window === 'undefined') return [];
  let list = getSavedBreakdowns();
  list = list.filter((b) => b.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    if (getActiveBreakdownId() === id) {
      setActiveBreakdownId(list[0]?.id || null);
    }
  } catch (err) {
    console.error('Failed to delete breakdown:', err);
  }
  return list;
}

export function updateStepInBreakdown(
  breakdownId: string,
  stepId: string,
  updates: Partial<MicroStep>
): TaskBreakdown | null {
  const list = getSavedBreakdowns();
  const index = list.findIndex((b) => b.id === breakdownId);
  if (index === -1) return null;

  const breakdown = list[index];
  const stepIndex = breakdown.steps.findIndex((s) => s.id === stepId);
  if (stepIndex === -1) return null;

  breakdown.steps[stepIndex] = {
    ...breakdown.steps[stepIndex],
    ...updates,
  };

  // Check if all steps are completed
  const allDone = breakdown.steps.every((s) => s.completed);
  breakdown.status = allDone ? 'completed' : 'active';
  breakdown.updatedAt = new Date().toISOString();

  list[index] = breakdown;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to update step in localStorage:', err);
  }

  return breakdown;
}

export function addCustomStepToBreakdown(
  breakdownId: string,
  newStep: Omit<MicroStep, 'id' | 'stepNumber' | 'completed'>
): TaskBreakdown | null {
  const list = getSavedBreakdowns();
  const index = list.findIndex((b) => b.id === breakdownId);
  if (index === -1) return null;

  const breakdown = list[index];
  const nextNum = breakdown.steps.length + 1;

  const step: MicroStep = {
    id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    stepNumber: nextNum,
    title: newStep.title,
    estimatedMinutes: newStep.estimatedMinutes || 10,
    whyItWorks: newStep.whyItWorks || 'Breaking tasks down into small chunks prevents cognitive overload.',
    microAction: newStep.microAction || 'Set a 10-minute timer and take the first step.',
    quickTip: newStep.quickTip || '',
    completed: false,
  };

  breakdown.steps.push(step);
  breakdown.status = 'active';
  breakdown.updatedAt = new Date().toISOString();

  list[index] = breakdown;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to add custom step:', err);
  }

  return breakdown;
}
