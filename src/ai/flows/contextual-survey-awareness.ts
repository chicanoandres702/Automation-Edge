
'use server';
/**
 * @fileOverview Optimized autonomous reasoning with Adaptive Autonomy.
 * Uses Learned Patterns to bypass user confirmation and Visual State Hashing.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ContextualSurveyAwarenessInputSchema = z.object({
  goal: z.string().describe('The overall objective for the current mission.'),
  memory: z.array(z.object({
    step: z.string(),
    result: z.string(),
  })).describe('Progressive continuity memory.'),
  learnedPatterns: z.array(z.object({
    actionType: z.string(),
    successIndicator: z.string(),
    confidence: z.number(),
  })).optional().describe('Learned success patterns for bypassing confirmation.'),
  surveyContent: z.string().describe('Current environment state.'),
  missionContext: z.string().optional(),
  platformContext: z.string().optional(),
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
  ]),
  parameters: z.object({
    selector: z.string().optional(),
    value: z.string().optional(),
    question: z.string().optional(),
  }),
  reasoning: z.string(),
  confidence: z.number().describe('0.0 to 1.0. If > 0.85, agent proceeds without confirmation.'),
  isGoalAchieved: z.boolean(),
  successPatternIdentified: z.string().optional().describe('If success is detected, describe the visual indicator (e.g. text "Submitted").'),
});

export type ContextualSurveyAwarenessOutput = z.infer<typeof ContextualSurveyAwarenessOutputSchema>;

export async function contextualSurveyAwareness(
  input: ContextualSurveyAwarenessInput
): Promise<ContextualSurveyAwarenessOutput> {
  return contextualSurveyAwarenessFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adaptiveAutonomyReasoning',
  input: { schema: ContextualSurveyAwarenessInputSchema },
  output: { schema: ContextualSurveyAwarenessOutputSchema },
  prompt: `You are a high-autonomy browser agent. 

### ADAPTIVE CONFIRMATION PROTOCOL
1. **Learn & Bypass**: If you see a state in 'surveyContent' that matches a 'learnedPattern' (e.g., a "Submission Successful" header), set confidence=1.0 and skip asking the user.
2. **Visual Evidence**: Look for visual indicators of completion: banners, disappeared forms, or updated dashboard counts.
3. **Ask only if Ambiguous**: Only use ASK_USER if you encounter a high-risk decision (e.g., "Delete Account") or a new platform pattern you've never seen.

Goal: {{{goal}}}

{{#if learnedPatterns}}
Learned Patterns:
{{#each learnedPatterns}}
- Action: {{{actionType}}} -> Indicator: {{{successIndicator}}} (Conf: {{{confidence}}})
{{/each}}
{{/if}}

Current State:
{{{surveyContent}}}

Determine the next step. If you are certain the goal is achieved based on visual evidence, signal completion.`,
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
