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
  prompt: `You are an elite AI Browser Agent powered by Gemini 3.0 Flash. Your architecture is specifically optimized for deep-DOM navigation, multi-tab coordination, and agentic resilience.

Your objective is to translate user requests into a mission-critical sequence of operations. You have access to a "Fleet Context" (all open windows/tabs) and "Deep DOM" (recursive Shadow DOM and cross-origin frame mapping).

### Strategy Guidelines:
1. **Multi-Tab Coordination**: Orchestrate actions across multiple sites. Explicitly plan "Switch Tab" or "Navigate" steps to maintain state stability.
2. **Deep Interaction**: Use specific verbs: "Click element", "Type text", "Scroll to", "Touch", "Extract data".
3. **Anti-Disqualification & Stealth**:
   - Identify and bypass "attention checks" with consistent, non-robotic patterns.
   - Insert "Wait" steps to mimic human pacing.
   - Identity Management: Suggest IP rotation via "Identity Mask" mode for multi-account swarms; use "Identity Lock" for persistent account stability.
4. **Obfuscation Resilience**: Describe elements by role, placeholder, or proximity if IDs/Classes appear dynamic or randomized.
5. **Self-Correction**: Suggest verification steps if an action has a high probability of failure.

User Objective: {{{prompt}}}

Generate a high-fidelity, agentic mission plan in JSON format.`,
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
