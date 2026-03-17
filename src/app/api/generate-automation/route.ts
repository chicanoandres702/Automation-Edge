import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  console.log('[API] Received generate-automation request');
  try {
    const body = await req.json();
    console.log('[API] Request body parsed');

    const apiKey = body?.apiKey || body?.ai_api_key || null;
    if (apiKey) {
      console.log('[API] Injecting provided API key into environment');
      process.env.GOOGLE_API_KEY = apiKey;
    } else {
      console.log('[API] Using pre-configured environment API key');
    }

    console.log('[API] Dynamically importing flow...');
    const mod = await import('@/ai/flows/generate-automation-from-prompt');
    console.log('[API] Flow imported. Initiating generation...');

    const result = await mod.generateAutomationFromPrompt(body);
    console.log('[API] Generation successful');

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API] Error during generation:', err);
    return NextResponse.json({ error: err?.message || 'AI generation failed' }, { status: 500 });
  }
}
