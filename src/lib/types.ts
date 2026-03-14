export type AutomationStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed' | 'seeking' | 'intervention_required';

export type ActionType = 'click' | 'type' | 'scroll' | 'touch' | 'navigate' | 'wait' | 'extract' | 'switch-tab';

export interface AutomationStep {
  id: string;
  description: string;
  type: ActionType;
  target?: string; // CSS Selector or XPath
  value?: string;  // Text to type or URL
  tabId?: number;  // Target tab for the action
  status: 'pending' | 'active' | 'completed' | 'failed' | 'needs_review';
  timestamp?: number;
}

export interface TabContext {
  id: number;
  windowId: number;
  url: string;
  title: string;
  frameCount: number;
  domSnippet: string;
}

export interface AutomationTask {
  id: string;
  prompt: string;
  status: AutomationStatus;
  steps: AutomationStep[];
  currentStepIndex: number;
  observedTabs: TabContext[];
  createdAt: number;
  updatedAt: number;
  manualMode?: boolean;
}
