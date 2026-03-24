import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    providers: {
      chatgpt: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      perplexity: !!process.env.PERPLEXITY_API_KEY,
    },
  });
}
