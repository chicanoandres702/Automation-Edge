export type AutomationStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';

export interface AutomationStep {
  id: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  timestamp?: number;
}

export interface AutomationTask {
  id: string;
  prompt: string;
  status: AutomationStatus;
  steps: AutomationStep[];
  currentStepIndex: number;
  createdAt: number;
  updatedAt: number;
}