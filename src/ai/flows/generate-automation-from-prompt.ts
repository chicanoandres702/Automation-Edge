'use server';
/**
 * @fileOverview This file implements a Genkit flow to interpret natural language
 * prompts and generate a browser automation workflow. It focuses on tasks like
 * survey completion and anti-disqualification strategies.
 *
 * - generateAutomationFromPrompt - A function that handles the automation workflow generation process.
 * - GenerateAutomationFromPromptInput - The input type for the generateAutomationFromPrompt function.
 * - GenerateAutomationFromPromptOutput - The return type for the generateAutomationFromPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAutomationFromPromptInputSchema = z
  .string()
  .describe('A natural language description of the desired browser automation task.');
export type GenerateAutomationFromPromptInput = z.infer<
  typeof GenerateAutomationFromPromptInputSchema
>;

const GenerateAutomationFromPromptOutputSchema = z
  .object({
    workflowSteps: z
      .array(z.string())
      .describe('An array of steps describing the browser automation workflow.'),
  })
  .describe('The generated browser automation workflow.');
export type GenerateAutomationFromPromptOutput = z.infer<
  typeof GenerateAutomationFromPromptOutputSchema
>;

export async function generateAutomationFromPrompt(
  input: GenerateAutomationFromPromptInput
): Promise<GenerateAutomationFromPromptOutput> {
  return generateAutomationFromPromptFlow(input);
}

const automationPrompt = ai.definePrompt({
  name: 'generateAutomationPrompt',
  input: {schema: GenerateAutomationFromPromptInputSchema},
  output: {schema: GenerateAutomationFromPromptOutputSchema},
  prompt: `You are an AI assistant specialized in generating detailed browser automation workflows.

Given a natural language description of a task, interpret it and generate a step-by-step browser automation workflow in JSON format. Each step should be a clear, concise instruction for a browser automation agent.

Focus on common browser interactions such as navigating to URLs, clicking buttons or links, typing text into input fields, selecting options from dropdowns, and handling forms. When specifying selectors, use general descriptions if specific IDs or classes are not known (e.g., 'the submit button', 'the text input for email').

For survey completion tasks, consider strategies to avoid disqualification. This might include:
- Varying response times to appear more human.
- Providing consistent (but not overly generic) answers across related questions.
- Recognizing and adapting to skip logic or conditional questions.
- Handling common survey question types (e.g., multiple choice, open text, rating scales).

The output MUST be a JSON object with a single key 'workflowSteps', which is an array of strings. Each string in the array represents one distinct automation step.

User request: {{{prompt}}}`,
});

const generateAutomationFromPromptFlow = ai.defineFlow(
  {
    name: 'generateAutomationFromPromptFlow',
    inputSchema: GenerateAutomationFromPromptInputSchema,
    outputSchema: GenerateAutomationFromPromptOutputSchema,
  },
  async input => {
    const {output} = await automationPrompt(input);
    return output!;
  }
);
