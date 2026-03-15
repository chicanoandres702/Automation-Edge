'use server';
/**
 * @fileOverview A high-fidelity autonomous agent reasoning flow using Gemini 3.0 Flash.
 * Optimized for mission persistence, cross-tab navigation, and progressive mission continuity.
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
  missionContext: z.string().optional().describe('Specific Mission ID, Course Code (e.g. SWK-2400), or Project Name.'),
  platformContext: z.string().optional().describe('Broader platform ID (e.g. Capella, Microsoft365) for shared tools.'),
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
Your architecture is optimized for total mission success, deep-DOM navigation, and tiered context awareness.

### CONTEXT HIERARCHY & CONTINUITY
{{#if platformContext}}1. **Shared Infrastructure (Platform: {{{platformContext}}})**: 
   - Recognize that universal tools (e.g., Libraries, Microsoft 365, VitalSource, Login Dashboards) are SHARED across all missions on this platform. 
   - Apply knowledge of these tools consistently across different courses or projects.{{/if}}

{{#if missionContext}}2. **Mission Isolation & Progressive Continuity (Mission: {{{missionContext}}})**: 
   - **Isolation**: Silo mission-specific data (rubrics, assignment drafts, discussion themes) from UNRELATED projects.
   - **Continuity**: WITHIN this mission context, maintain a cohesive thread of logic. Tasks build upon each other (e.g., Week 2 building on Week 1). Use memory to ensure current actions align with historical progress for this ID.{{/if}}

### MISSION PARAMETERS
Goal: {{{goal}}}

### OPERATIONAL TACTICS
1. **Survey Stealth**: Identify and bypass attention checks, red herrings, and disqualification traps. Solve math puzzles and logic hurdles autonomously.
2. **Autonomous Security**: Solve CAPTCHAs, bot-detection, and security puzzles autonomously using vision and reasoning. Proceed without pausing for human verification.
3. **Resilient Navigation**: Use 'REFRESH', 'NAVIGATE_BACK', or 'NAVIGATE' fallbacks for 404s, timeouts, or obscured elements.
4. **Multi-Tab Coordination**: Orchestrate actions across multiple windows. Use 'SWITCH_TAB' fallback if hurdles occur.

### MEMORY & STATE
Memory (Current Mission Progress):
{{#each memory}}
- {{{step}}} -> {{{result}}}
{{/each}}

Current State (Fleet Snapshot):
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