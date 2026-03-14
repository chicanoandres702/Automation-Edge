'use server';
/**
 * @fileOverview A Genkit flow for real-time survey content analysis to inform automation actions.
 *
 * - contextualSurveyAwareness - A function that analyzes survey page content and suggests the next action.
 * - ContextualSurveyAwarenessInput - The input type for the contextualSurveyAwareness function.
 * - ContextualSurveyAwarenessOutput - The return type for the contextualSurveyAwareness function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ContextualSurveyAwarenessInputSchema = z.object({
  surveyContent: z
    .string()
    .describe(
      'The HTML or text content of the current survey page for analysis.'
    ),
  taskDescription: z
    .string()
    .describe(
      'A brief description of the overall browser automation task or goal, e.g., "complete a survey about tech usage."'
    ),
});
export type ContextualSurveyAwarenessInput = z.infer<
  typeof ContextualSurveyAwarenessInputSchema
>;

const ContextualSurveyAwarenessOutputSchema = z.object({
  nextAction: z
    .enum(['ANSWER_QUESTION', 'CLICK_BUTTON', 'NAVIGATE_TO_URL', 'WAIT', 'FLAG_FOR_REVIEW'])
    .describe('The next action the AI agent should take.'),
  targetElementSelector: z
    .string()
    .optional()
    .describe(
      'A CSS selector for the HTML element the action applies to (e.g., button, input field, radio option). Required for ANSWER_QUESTION or CLICK_BUTTON.'
    ),
  answerValue: z
    .string()
    .optional()
    .describe(
      'The suggested answer value for an input field or selection. Required for ANSWER_QUESTION.'
    ),
  targetUrl: z
    .string()
    .optional()
    .describe('The URL to navigate to, if nextAction is NAVIGATE_TO_URL.'),
  reasoning: z
    .string()
    .describe(
      "The AI agent's reasoning for the chosen action, including how it minimizes disqualification."
    ),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe('A confidence score (0-1) for the suggested action.'),
});
export type ContextualSurveyAwarenessOutput = z.infer<
  typeof ContextualSurveyAwarenessOutputSchema
>;

export async function contextualSurveyAwareness(
  input: ContextualSurveyAwarenessInput
): Promise<ContextualSurveyAwarenessOutput> {
  return contextualSurveyAwarenessFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contextualSurveyAwarenessPrompt',
  input: { schema: ContextualSurveyAwarenessInputSchema },
  output: { schema: ContextualSurveyAwarenessOutputSchema },
  prompt: `You are an AI browser automation agent specialized in completing online surveys and minimizing disqualifications. Your primary goal is to analyze the provided 'surveyContent' and determine the most appropriate next action based on the 'taskDescription'.

Carefully read the 'surveyContent' and identify survey questions, input fields, and navigation elements (like 'Next' or 'Submit' buttons). Consider common survey disqualification patterns (e.g., inconsistent answers, speed-running, demographic mismatches based on 'taskDescription'). If the survey content requires a specific answer based on the 'taskDescription' to avoid disqualification, prioritize that.

Provide your response in JSON format according to the output schema. If you are uncertain or believe a human review is needed, choose 'FLAG_FOR_REVIEW' for 'nextAction' and explain why in 'reasoning'.

Task Description: {{{taskDescription}}}
Survey Page Content:
---
{{{surveyContent}}}
---
`,
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
