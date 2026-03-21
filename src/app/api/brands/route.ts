import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { brands } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

const createBrandSchema = z.object({
  name: z.string().min(1).max(200),
  aliases: z.array(z.string()).default([]),
  isOwn: z.boolean().default(false),
});

export async function GET() {
  const result = await db
    .select()
    .from(brands)
    .orderBy(desc(brands.createdAt));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createBrandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = await db.insert(brands).values(parsed.data).returning();
  return NextResponse.json(result[0], { status: 201 });
}
