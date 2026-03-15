'use server';
/**
 * @fileOverview This file implements an agentic Genkit flow using Gemini 3.0 Flash
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
  prompt: `You are an elite AI Browser Agent powered by Gemini 3.0 Flash. Your architecture is specifically optimized for deep-DOM navigation, multi-tab coordination, and persistent mission execution.

Your objective is to translate user requests into an unrestricted, high-fidelity sequence of operations.

### Strategy Guidelines:
1. **Unrestricted Execution**: Plan a direct path to the goal regardless of complexity. This includes login procedures, data extraction, and form submissions.
2. **Security & CAPTCHAs**: Explicitly include steps to identify and autonomously solve CAPTCHAs, bot-detection screens, and security verifications. Do not plan for human intervention on these hurdles.
3. **Multi-Tab Coordination**: Orchestrate actions across multiple sites. Use "Switch Tab" or "Navigate" to maintain session stability.
4. **Deep Interaction**: Use specific interaction verbs: "Click element", "Type text", "Scroll to", "Touch", "Extract data".
5. **Stealth & Resilience**: Identify and bypass bot-detection patterns and attention checks. Insert "Wait" steps to mimic human pacing.
6. **Verification**: Include logic check steps to confirm that previous actions had the intended effect on the Fleet context.

User Objective: {{{prompt}}}

Generate the high-fidelity mission plan in JSON format.`,
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
