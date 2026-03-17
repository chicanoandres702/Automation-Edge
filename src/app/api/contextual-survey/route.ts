import { NextResponse } from 'next/server';
import { contextualSurveyAwareness } from '@/ai/flows/contextual-survey-awareness';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await contextualSurveyAwareness(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Contextual survey failed' }, { status: 500 });
  }
}
