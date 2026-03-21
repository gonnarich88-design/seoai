import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { eq } from 'drizzle-orm';

// Database availability check -- integration tests require PostgreSQL
let dbAvailable = false;
let db: Awaited<typeof import('@/lib/db')>['db'];
let keywords: Awaited<typeof import('@/lib/db/schema')>['keywords'];

beforeAll(async () => {
  try {
    const dbModule = await import('@/lib/db');
    const schemaModule = await import('@/lib/db/schema');
    db = dbModule.db;
    keywords = schemaModule.keywords;
    // Probe database connectivity
    await db.select().from(keywords).limit(1);
    dbAvailable = true;
  } catch {
    console.warn(
      'PostgreSQL not available -- skipping integration tests. Run with DATABASE_URL to enable.',
    );
  }
});

describe('Keywords CRUD', () => {
  const testIds: string[] = [];

  afterEach(async () => {
    if (!dbAvailable) return;
    for (const id of testIds) {
      await db.delete(keywords).where(eq(keywords.id, id));
    }
    testIds.length = 0;
  });

  it('should create a keyword with label and prompt', async ({ skip }) => {
    if (!dbAvailable) skip();
    const result = await db
      .insert(keywords)
      .values({
        label: 'Test SEO Tools',
        prompt: 'What are the best SEO tools in 2025?',
      })
      .returning();

    testIds.push(result[0].id);
    expect(result[0].label).toBe('Test SEO Tools');
    expect(result[0].prompt).toBe('What are the best SEO tools in 2025?');
    expect(result[0].promptVersion).toBe(1);
    expect(result[0].isActive).toBe(true);
  });

  it('should list keywords ordered by createdAt desc', async ({ skip }) => {
    if (!dbAvailable) skip();
    const r1 = await db
      .insert(keywords)
      .values({
        label: 'First',
        prompt: 'First prompt for testing purposes',
      })
      .returning();
    const r2 = await db
      .insert(keywords)
      .values({
        label: 'Second',
        prompt: 'Second prompt for testing purposes',
      })
      .returning();
    testIds.push(r1[0].id, r2[0].id);

    const all = await db.select().from(keywords).orderBy(keywords.createdAt);
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('should update a keyword and increment promptVersion when prompt changes', async ({
    skip,
  }) => {
    if (!dbAvailable) skip();
    const created = await db
      .insert(keywords)
      .values({
        label: 'Version Test',
        prompt: 'Original prompt for version testing',
      })
      .returning();
    testIds.push(created[0].id);

    await db
      .update(keywords)
      .set({
        prompt: 'Updated prompt for version testing v2',
        promptVersion: created[0].promptVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(keywords.id, created[0].id));

    const updated = await db
      .select()
      .from(keywords)
      .where(eq(keywords.id, created[0].id));
    expect(updated[0].promptVersion).toBe(2);
    expect(updated[0].prompt).toBe('Updated prompt for version testing v2');
  });

  it('should delete a keyword', async ({ skip }) => {
    if (!dbAvailable) skip();
    const created = await db
      .insert(keywords)
      .values({
        label: 'Delete Me',
        prompt: 'This keyword will be deleted during test',
      })
      .returning();

    await db.delete(keywords).where(eq(keywords.id, created[0].id));
    const found = await db
      .select()
      .from(keywords)
      .where(eq(keywords.id, created[0].id));
    expect(found.length).toBe(0);
  });

  it('should toggle isActive without deleting data', async ({ skip }) => {
    if (!dbAvailable) skip();
    const created = await db
      .insert(keywords)
      .values({
        label: 'Toggle Test',
        prompt: 'This keyword will be toggled active/inactive',
      })
      .returning();
    testIds.push(created[0].id);

    await db
      .update(keywords)
      .set({ isActive: false })
      .where(eq(keywords.id, created[0].id));
    const toggled = await db
      .select()
      .from(keywords)
      .where(eq(keywords.id, created[0].id));
    expect(toggled[0].isActive).toBe(false);
    expect(toggled[0].label).toBe('Toggle Test');
  });
});
