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
  successPatternIdentified: z.string().optional().describe('A descriptive string of the visual evidence indicating success (e.g. "Green checkmark on button", "Success Alert visible").'),
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
1. **Learn & Bypass**: Compare the current 'surveyContent' with 'learnedPatterns'. If you see a visual indicator (text, status, or disappeared element) that matches a success pattern, bypass ASK_USER. Set confidence=1.0.
2. **Visual Evidence**: Look for banners like "Submitted", "Thank You", or "Step Complete". If found, set isGoalAchieved=true and describe the pattern in 'successPatternIdentified'.
3. **Intervention**: Only use ASK_USER if the path forward is genuinely ambiguous or high-risk (e.g. permanent deletion).

Goal: {{{goal}}}

{{#if learnedPatterns}}
### KNOWN SUCCESS PATTERNS (BYPASS IF SEEN):
{{#each learnedPatterns}}
- Action: {{{actionType}}} -> Evidence Indicator: {{{successIndicator}}}
{{/each}}
{{/if}}

Current Environment State:
{{{surveyContent}}}

Identify the next action. If you see a clear indicator of success that matches a known pattern, prioritize autonomy.`,
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
