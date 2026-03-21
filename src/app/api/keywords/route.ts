import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { keywords } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

const createKeywordSchema = z.object({
  label: z.string().min(1).max(200),
  prompt: z.string().min(10).max(2000),
});

export async function GET() {
  const result = await db
    .select()
    .from(keywords)
    .orderBy(desc(keywords.createdAt));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createKeywordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = await db.insert(keywords).values(parsed.data).returning();
  return NextResponse.json(result[0], { status: 201 });
}
