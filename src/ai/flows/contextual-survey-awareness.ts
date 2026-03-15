'use server';
/**
 * @fileOverview A high-fidelity autonomous agent reasoning flow using Gemini 3.0 Flash.
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
  riskLevel: z.enum(['low', 'medium', 'high']).describe('Risk of disqualification or safety violation.'),
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
Your architecture is optimized for deep-DOM navigation, survey completion, and mission resilience.

### OBJECTIVE
Analyze the 'Goal', 'Memory', and current 'State' (surveyContent) to determine the next optimal action.

### OPERATIONAL GUIDELINES
1. **Memory Awareness**: Use the 'memory' to avoid repeating failed actions or to determine if a multi-step plan is progressing.
2. **Contextual Resilience**: If you encounter a 404, a timeout, or an obscured element, use 'NAVIGATE_BACK', 'REFRESH', or 'ASK_USER' as a fallback.
3. **Safety Protocol**: You MUST NOT automate or modify login credentials, financial data, or grades. If asked, use 'ASK_USER' to explain the safety violation.
4. **Survey Stealth**: Identify attention checks (e.g., "select Strongly Disagree") and red herrings to avoid disqualification.
5. **Multi-Tab Execution**: Orchestrate across tabs using 'SWITCH_TAB' and 'CLOSE_TAB' for spam/ads or multi-site workflows.

Goal: {{{goal}}}

Memory:
{{#each memory}}
- {{{step}}} -> {{{result}}}
{{/each}}

State:
---
{{{surveyContent}}}
---

Output the mission-critical next action in strict JSON format.`,
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
