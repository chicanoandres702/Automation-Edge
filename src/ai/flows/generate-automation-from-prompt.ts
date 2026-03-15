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

const GenerateAutomationFromPromptInputSchema = z.object({
  prompt: z.string().describe('A natural language description of the desired browser automation task.'),
  missionContext: z.string().optional().describe('The context (e.g. course ID) this automation belongs to.'),
});
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
  prompt: `You are an elite AI Browser Agent. Your objective is to translate user requests into a high-fidelity sequence of operations.

### Progressive Continuity Strategy:
{{#if missionContext}}Mission Context: {{{missionContext}}}
When planning this automation, consider that it may build upon previous work within the same context (e.g., a Week 2 assignment building on Week 1). Ensure the steps are logically consistent with a progressive workflow.{{/if}}

### Strategy Guidelines:
1. **Unrestricted Execution**: Plan a direct path to the goal. Include login, extraction, and submission.
2. **Autonomous Security**: Include steps to identify and solve CAPTCHAs or security verifications autonomously.
3. **Multi-Tab Coordination**: Orchestrate actions across multiple sites and maintain session stability.
4. **Resilience**: Plan for verification steps to confirm successful interactions with the Fleet context.

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
