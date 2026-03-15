'use server';
/**
 * @fileOverview A high-fidelity autonomous agent reasoning flow using Gemini 3.0 Flash.
 * Optimized for mission persistence, cross-tab navigation, and strict knowledge compartmentalization.
 *
 * - contextualSurveyAwareness - The core decision engine for the autonomous agent.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ContextualSurveyAwarenessInputSchema = z.object({
  goal: z.string().describe('The overall objective for the current mission.'),
  memory: z.array(z.object({
    step: z.string(),
    result: z.string(),
  })).describe('List of previously executed actions and their results.'),
  surveyContent: z.string().describe('The deep-DOM or textual state of the current active page/tabs.'),
  missionContext: z.string().optional().describe('Specific Mission ID, Project Name, or Course Context (e.g. SWK-2400) to ensure isolation.'),
});

export type ContextualSurveyAwarenessInput = z.infer<typeof ContextualSurveyAwarenessInputSchema>;

const ContextualSurveyAwarenessOutputSchema = z.object({
  action: z.enum([
    'CLICK', 
    'TYPE', 
    'SCROLL', 
    'WAIT', 
    'SWITCH_TAB', 
    'CLOSE_TAB', 
    'ASK_USER', 
    'NAVIGATE', 
    'REFRESH', 
    'NAVIGATE_BACK'
  ]).describe('The specific tactical action to take.'),
  parameters: z.object({
    selector: z.string().optional().describe('CSS Selector for the target element.'),
    value: z.string().optional().describe('Value to input or direction to scroll.'),
    direction: z.enum(['UP', 'DOWN', 'LEFT', 'RIGHT']).optional(),
    amount: z.string().optional().describe('Amount to scroll (e.g., "viewport", "post").'),
    tab_id: z.string().optional().describe('Target tab identifier.'),
    question: z.string().optional().describe('The question for the user if action is ASK_USER.'),
  }),
  reasoning: z.string().describe('The agentic reasoning behind this specific action choice.'),
  riskLevel: z.enum(['low', 'medium', 'high']).describe('Risk of disqualification or detection.'),
});

export type ContextualSurveyAwarenessOutput = z.infer<typeof ContextualSurveyAwarenessOutputSchema>;

export async function contextualSurveyAwareness(
  input: ContextualSurveyAwarenessInput
): Promise<ContextualSurveyAwarenessOutput> {
  return contextualSurveyAwarenessFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autonomousAgentReasoning',
  input: { schema: ContextualSurveyAwarenessInputSchema },
  output: { schema: ContextualSurveyAwarenessOutputSchema },
  prompt: `You are an elite autonomous browser agent powered by Gemini 3.0 Flash. 
Your architecture is optimized for total mission success, deep-DOM navigation, and mission-critical knowledge isolation.

### KNOWLEDGE ISOLATION PROTOCOL
{{#if missionContext}}Active Mission Context: {{{missionContext}}}
STRICT DIRECTIVE: You must use ONLY data, rubrics, memory, and logic associated with this specific Mission Context. 
DO NOT bleed or reference knowledge from other projects, courses, or historical tasks. Your reasoning must be completely siloing to this context ID.{{/if}}

### MISSION PARAMETERS
Goal: {{{goal}}}

### OPERATIONAL TACTICS
1. **Survey Stealth**: Identify and bypass attention checks, red herrings, and disqualification traps. Solve math puzzles and logic hurdles autonomously.
2. **Hurdle Resolution**: Solve CAPTCHAs and bot-detection puzzles autonomously using vision and reasoning. Do NOT ask for help with security puzzles; solve them and proceed.
3. **Multi-Tab Coordination**: Navigate across multiple sites and windows. Use 'SWITCH_TAB' or 'NAVIGATE' fallbacks if you encounter hurdles.
4. **Contextual Resilience**: Use 'REFRESH', 'NAVIGATE_BACK', or 'NAVIGATE' fallbacks if you encounter 404s, timeouts, or obscured elements.

### MEMORY & STATE
Memory:
{{#each memory}}
- {{{step}}} -> {{{result}}}
{{/each}}

Current State (Fleet Snapshot):
---
{{{surveyContent}}}
---

Determine the next tactical action to achieve the goal while maintaining strict mission compartmentalization.`,
});

const contextualSurveyAwarenessFlow = ai.defineFlow(
  {
    name: 'contextualSurveyAwarenessFlow',
    inputSchema: ContextualSurveyAwarenessInputSchema,
    outputSchema: ContextualSurveyAwarenessOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
