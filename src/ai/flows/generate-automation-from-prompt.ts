'use server';
/**
 * @fileOverview This file implements an agentic Genkit flow using Gemini 2.0 Flash
 * to interpret natural language prompts and generate a high-fidelity browser automation workflow.
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
    reasoning: z.string().describe('The AI reasoning for the chosen multi-step plan.'),
    estimatedRisk: z.enum(['low', 'medium', 'high']).describe('Risk level for disqualification or detection.'),
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
  prompt: `You are a high-level AI Browser Agent specialized in cross-tab, deep-DOM automation. You are powered by Gemini 2.0 Flash for enhanced agentic reasoning.

Your objective is to translate user requests into a mission-critical sequence of operations. You have access to a "Fleet Context" (multi-tab/multi-window state) and "Deep DOM" (Shadow DOM and cross-origin frames).

### Strategy Guidelines:
1. **Multi-Tab Coordination**: If a task involves multiple sites, explicitly include "Switch Tab" or "Navigate" steps to manage context.
2. **Deep Interaction**: Use specific interaction verbs: "Click element", "Type text into field", "Scroll to section", "Touch element" (for mobile-emulated targets), "Extract data".
3. **Anti-Disqualification (Surveys/Forms)**:
   - Identify "attention checks" and handle them with consistent, non-patterned responses.
   - Suggest pauses or "Wait" steps between high-velocity actions.
   - Maintain identity stability for single-account tasks; suggest IP rotation ONLY for multi-account swarms.
4. **Resilience**: If a specific ID or Class is likely to be dynamic (e.g., React/Next obfuscation), describe the element by its role, placeholder, or proximity (e.g., "The blue login button inside the main header").
5. **Agentic Recovery**: Plan for checks; if an action might fail, suggest a verification step.

User Objective: {{{prompt}}}

Generate a sophisticated, agentic plan in JSON format.`,
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
