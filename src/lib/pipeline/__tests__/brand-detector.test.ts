import { describe, it, expect } from 'vitest';
import { detectBrands, type BrandInput } from '../brand-detector';

describe('detectBrands', () => {
  it('detects brand by exact name (case-insensitive)', () => {
    const brands: BrandInput[] = [
      { id: 'b1', name: 'Ahrefs', aliases: [] },
    ];
    const result = detectBrands('I recommend Ahrefs for SEO', brands);

    expect(result).toHaveLength(1);
    expect(result[0].brandId).toBe('b1');
    expect(result[0].mentioned).toBe(true);
    expect(result[0].position).toBe(1);
    expect(result[0].contextSnippet).toContain('Ahrefs');
  });

  it('detects brand by alias', () => {
    const brands: BrandInput[] = [
      { id: 'b1', name: 'SEMrush', aliases: ['semrush'] },
    ];
    const result = detectBrands('Try semrush tool', brands);

    expect(result).toHaveLength(1);
    expect(result[0].mentioned).toBe(true);
  });

  it('returns mentioned:false when brand not found', () => {
    const brands: BrandInput[] = [
      { id: 'b1', name: 'Ahrefs', aliases: [] },
    ];
    const result = detectBrands('No mentions here', brands);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      brandId: 'b1',
      mentioned: false,
      position: null,
      contextSnippet: null,
    });
  });

  it('position is ordinal rank among all detected brands', () => {
    const brands: BrandInput[] = [
      { id: 'b1', name: 'Ahrefs', aliases: [] },
      { id: 'b2', name: 'SEMrush', aliases: [] },
    ];
    const result = detectBrands('Try Ahrefs and then SEMrush', brands);

    const ahrefs = result.find((r) => r.brandId === 'b1')!;
    const semrush = result.find((r) => r.brandId === 'b2')!;
    expect(ahrefs.position).toBe(1);
    expect(semrush.position).toBe(2);
  });

  it('context snippet is 50-100 chars around mention', () => {
    const longText =
      'A'.repeat(50) + ' Ahrefs is great ' + 'B'.repeat(50);
    const brands: BrandInput[] = [
      { id: 'b1', name: 'Ahrefs', aliases: [] },
    ];
    const result = detectBrands(longText, brands);

    expect(result[0].contextSnippet).not.toBeNull();
    expect(result[0].contextSnippet!.length).toBeGreaterThanOrEqual(3);
    expect(result[0].contextSnippet!.length).toBeLessThanOrEqual(110);
  });

  it('multiple brands with some not mentioned', () => {
    const brands: BrandInput[] = [
      { id: 'b1', name: 'Ahrefs', aliases: [] },
      { id: 'b2', name: 'SEMrush', aliases: [] },
      { id: 'b3', name: 'Moz', aliases: [] },
    ];
    const result = detectBrands('I recommend Ahrefs and Moz', brands);

    const ahrefs = result.find((r) => r.brandId === 'b1')!;
    const semrush = result.find((r) => r.brandId === 'b2')!;
    const moz = result.find((r) => r.brandId === 'b3')!;

    expect(ahrefs.mentioned).toBe(true);
    expect(semrush.mentioned).toBe(false);
    expect(semrush.position).toBeNull();
    expect(moz.mentioned).toBe(true);
  });

  it('aliases take priority by earliest match', () => {
    const brands: BrandInput[] = [
      { id: 'b1', name: 'Brand One', aliases: ['b1alias'] },
      { id: 'b2', name: 'Brand Two', aliases: ['b2early'] },
    ];
    // b2's alias appears first in the text
    const result = detectBrands('Use b2early then b1alias', brands);

    const b1 = result.find((r) => r.brandId === 'b1')!;
    const b2 = result.find((r) => r.brandId === 'b2')!;

    expect(b2.position).toBe(1);
    expect(b1.position).toBe(2);
  });
});
