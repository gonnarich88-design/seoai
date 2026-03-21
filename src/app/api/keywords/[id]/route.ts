import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { keywords } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const updateKeywordSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  prompt: z.string().min(10).max(2000).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await db.select().from(keywords).where(eq(keywords.id, id));
  if (result.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(result[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateKeywordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Check if keyword exists
  const existing = await db
    .select()
    .from(keywords)
    .where(eq(keywords.id, id));
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // If prompt changed, increment promptVersion (DATA-08: prompt versioning)
  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
  };

  if (parsed.data.prompt && parsed.data.prompt !== existing[0].prompt) {
    updateData.promptVersion = existing[0].promptVersion + 1;
  }

  const result = await db
    .update(keywords)
    .set(updateData)
    .where(eq(keywords.id, id))
    .returning();
  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await db
    .delete(keywords)
    .where(eq(keywords.id, id))
    .returning();
  if (result.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
