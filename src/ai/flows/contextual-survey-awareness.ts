'use server';
/**
 * @fileOverview A high-fidelity autonomous agent reasoning flow.
 * Optimized for tiered context: Shared Platform Knowledge + Mission Progressive Continuity.
 * Includes Anti-Cancellation and Recursive Verification protocols.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ContextualSurveyAwarenessInputSchema = z.object({
  goal: z.string().describe('The overall objective for the current mission.'),
  memory: z.array(z.object({
    step: z.string(),
    result: z.string(),
  })).describe('List of previously executed actions and results for progressive continuity.'),
  surveyContent: z.string().describe('The textual state of the current active page/tabs.'),
  missionContext: z.string().optional().describe('Specific Mission ID for progressive siloing.'),
  platformContext: z.string().optional().describe('Shared tool ID for universal platform knowledge.'),
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
  ]).describe('The tactical action to take.'),
  parameters: z.object({
    selector: z.string().optional().describe('CSS Selector for target.'),
    value: z.string().optional().describe('Input value.'),
    direction: z.enum(['UP', 'DOWN', 'LEFT', 'RIGHT']).optional(),
    amount: z.string().optional(),
    tab_id: z.string().optional(),
    question: z.string().optional().describe('Question for the user if action is ASK_USER.'),
  }),
  reasoning: z.string().describe('Agentic reasoning including verification of remaining tasks.'),
  isGoalAchieved: z.boolean().describe('True ONLY if the entire high-level goal is confirmed fulfilled.'),
  riskLevel: z.enum(['low', 'medium', 'high']),
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
  prompt: `You are an elite autonomous browser agent.

### CONTEXT HIERARCHY
{{#if platformContext}}1. **Shared Platform Knowledge (Tool: {{{platformContext}}})**: 
   - You are currently on a universal tool platform. 
   - Apply persistent shared knowledge of this tool's controls and layout across all missions.{{/if}}

{{#if missionContext}}2. **Mission Progressive Continuity (ID: {{{missionContext}}})**: 
   - This task is part of a larger, ongoing project. 
   - Week-over-week foundations apply here. Use memory to ensure continuity.{{/if}}

### MISSION OBJECTIVE
Goal: {{{goal}}}

### TACTICAL & ANTI-CANCELLATION PROTOCOLS
1. **No Premature Exit**: Do NOT signal completion (isGoalAchieved=true) unless you have verified that ALL pending tasks related to the goal are submitted.
2. **Recursive Verification**: After every action, survey the environment for "Remaining Tasks" or "Pending Submissions". If the user said "all homework", you must find and complete every single one.
3. **Resilience**: Solve CAPTCHAs, attention checks, and disqualification traps autonomously. Do NOT self-cancel due to environmental hurdles. Use REFRESH or NAVIGATE_BACK if stuck.
4. **Stealth**: Bypass red herrings in surveys through tactical reasoning.

### MEMORY & ACTIVE STATE
Progressive Memory:
{{#each memory}}
- {{{step}}} -> {{{result}}}
{{/each}}

Current Environment State:
---
{{{surveyContent}}}
---

Determine the next tactical step. Ensure exhaustive completion. Do not exit if more work remains.`,
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
