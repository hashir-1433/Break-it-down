export type EnergyLevel = 'low' | 'medium' | 'high';

export type ProcrastinationReason = 
  | 'overwhelmed' // Don't know where to start or task feels huge
  | 'perfectionism' // Afraid it won't be good enough
  | 'boredom' // Low motivation or repetitive
  | 'friction'; // Don't have materials or tools ready

export interface MicroStep {
  id: string;
  stepNumber: number;
  title: string;
  estimatedMinutes: number;
  whyItWorks: string;
  microAction: string;
  quickTip?: string;
  completed: boolean;
  completedAt?: string;
}

export interface TaskBreakdown {
  id: string;
  taskTitle: string;
  taskContext?: string;
  energyLevel: EnergyLevel;
  procrastinationReason?: ProcrastinationReason;
  timeAvailable?: string;
  steps: MicroStep[];
  encouragement?: string;
  firstStepNudge?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'archived';
}

export interface BreakdownRequest {
  taskTitle: string;
  taskContext?: string;
  energyLevel?: EnergyLevel;
  procrastinationReason?: ProcrastinationReason;
  timeAvailable?: string;
}

export interface StepRegenerateRequest {
  taskTitle: string;
  stepNumber: number;
  currentStepTitle: string;
  allStepsTitles: string[];
  feedback?: string;
}

export interface AudioSettings {
  soundEnabled: boolean;
  ambientSound: 'none' | 'brown-noise' | 'rain' | 'focus-hum';
}
