export type AutomationStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed' | 'seeking' | 'intervention_required' | 'retrying';

export type ActionType = 
  | 'click' 
  | 'type' 
  | 'scroll' 
  | 'touch' 
  | 'navigate' 
  | 'wait' 
  | 'extract' 
  | 'switch-tab' 
  | 'ask-user' 
  | 'close-tab' 
  | 'refresh' 
  | 'navigate-back';

export interface AutomationStep {
  id: string;
  description: string;
  type: ActionType;
  target?: string; // CSS Selector or XPath
  value?: string;  // Text to type or URL
  tabId?: string | number;  // Target tab for the action
  status: 'pending' | 'active' | 'completed' | 'failed' | 'needs_review' | 'retrying';
  retryCount: number;
  maxRetries: number;
  timestamp?: number;
  lastError?: string;
}

export interface TabContext {
  id: string | number;
  windowId: number;
  url: string;
  title: string;
  frameCount: number;
  domSnippet: string;
}

export interface ExecutionMemory {
  step: string;
  result: 'Success' | 'Failed' | string;
}

export interface AutomationTask {
  id: string;
  prompt: string;
  status: AutomationStatus;
  steps: AutomationStep[];
  currentStepIndex: number;
  observedTabs: TabContext[];
  memory: ExecutionMemory[];
  createdAt: number;
  updatedAt: number;
  manualMode?: boolean;
  identityMode: 'persistent' | 'rotational';
}
