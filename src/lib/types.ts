
export type AutomationStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed' | 'seeking';

export type ActionType = 'click' | 'type' | 'scroll' | 'touch' | 'navigate' | 'wait' | 'extract';

export interface AutomationStep {
  id: string;
  description: string;
  type: ActionType;
  target?: string; // CSS Selector or XPath
  value?: string;  // Text to type or URL
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
