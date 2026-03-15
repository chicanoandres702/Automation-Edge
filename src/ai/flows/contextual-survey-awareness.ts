'use server';
/**
 * @fileOverview A high-fidelity autonomous agent reasoning flow using Gemini 3.0 Flash.
 * Optimized for mission persistence, tool sharing, and progressive continuity.
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
  missionContext: z.string().optional().describe('Specific Mission ID or Course Code.'),
  platformContext: z.string().optional().describe('Shared tool platform (e.g. Google Docs, Microsoft 365).'),
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

### CONTEXT HIERARCHY
{{#if platformContext}}1. **Shared Tool Infrastructure (Platform: {{{platformContext}}})**: 
   - This site is a universal tool (e.g., Google Docs, M365, Library).
   - Knowledge of this tool's controls and functions is GLOBAL and SHARED across all missions. 
   - Use consistent logic for interacting with this platform regardless of the current project.{{/if}}

{{#if missionContext}}2. **Mission Isolation & Progressive Continuity (Mission: {{{missionContext}}})**: 
   - **Isolation**: Keep assignment data and rubrics siloed from UNRELATED projects.
   - **Continuity**: WITHIN this mission, tasks build on each other. Use memory to ensure Week 2 builds correctly on Week 1 foundations.{{/if}}

### MISSION PARAMETERS
Goal: {{{goal}}}

### OPERATIONAL TACTICS
1. **Survey Stealth**: Solve math puzzles, logic hurdles, and attention checks autonomously. Identification of red herrings is critical.
2. **Autonomous Security**: Solve CAPTCHAs and bot-detection autonomously using vision. Do NOT pause for human sight.
3. **Resilient Navigation**: Use 'REFRESH', 'NAVIGATE_BACK', or 'NAVIGATE' fallbacks for 404s or timeouts.
4. **Multi-Tab Coordination**: Orchestrate actions across multiple windows/tabs.

### MEMORY & STATE
Memory:
{{#each memory}}
- {{{step}}} -> {{{result}}}
{{/each}}

Current State snapshot:
---
{{{surveyContent}}}
---

Determine the next tactical action while ensuring progressive continuity and shared platform awareness.`,
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
