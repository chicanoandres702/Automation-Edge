import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // If an apiKey is provided in the request body, inject it into the
    // environment BEFORE importing the flow. This ensures the genkit
    // Google AI plugin reads the key at initialization time.
    const apiKey = body?.apiKey || body?.ai_api_key || null;
    if (apiKey) {
      // Set env var for Google AI plugin (development/testing only).
      // This allows callers to supply a per-request key from the client
      // (stored in extension storage) when the server does not have a
      // centrally configured key.
      process.env.GOOGLE_API_KEY = apiKey;
    }

    // Dynamically import the flow after setting env so genkit reads the key
    const mod = await import('@/ai/flows/generate-automation-from-prompt');
    const result = await mod.generateAutomationFromPrompt(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'AI generation failed' }, { status: 500 });
  }
}
