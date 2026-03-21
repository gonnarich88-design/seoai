import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { brands } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const updateBrandSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  aliases: z.array(z.string()).optional(),
  isOwn: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await db.select().from(brands).where(eq(brands.id, id));
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
  const parsed = updateBrandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Check if brand exists
  const existing = await db.select().from(brands).where(eq(brands.id, id));
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const result = await db
    .update(brands)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(brands.id, id))
    .returning();
  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await db
    .delete(brands)
    .where(eq(brands.id, id))
    .returning();
  if (result.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
