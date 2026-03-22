export interface BrandMatch {
  brandId: string;
  mentioned: boolean;
  position: number | null;
  contextSnippet: string | null;
}

export interface BrandInput {
  id: string;
  name: string;
  aliases: string[];
}

function extractSnippet(
  text: string,
  matchIndex: number,
  matchLength: number,
): string {
  const contextRadius = 40;
  const start = Math.max(0, matchIndex - contextRadius);
  const end = Math.min(text.length, matchIndex + matchLength + contextRadius);
  let snippet = text.slice(start, end);

  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

export function detectBrands(
  responseText: string,
  brands: BrandInput[],
): BrandMatch[] {
  const lowerText = responseText.toLowerCase();

  // Find earliest match index for each brand
  const brandMatches: {
    brand: BrandInput;
    matchIndex: number;
    matchLength: number;
  }[] = [];

  for (const brand of brands) {
    const searchTerms = [brand.name, ...brand.aliases];
    let earliestIndex = -1;
    let matchLength = 0;

    for (const term of searchTerms) {
      const idx = lowerText.indexOf(term.toLowerCase());
      if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
        earliestIndex = idx;
        matchLength = term.length;
      }
    }

    if (earliestIndex !== -1) {
      brandMatches.push({ brand, matchIndex: earliestIndex, matchLength });
    }
  }

  // Sort mentioned brands by their earliest match index to assign ordinal positions
  brandMatches.sort((a, b) => a.matchIndex - b.matchIndex);

  // Build position map
  const positionMap = new Map<string, number>();
  brandMatches.forEach((m, i) => {
    positionMap.set(m.brand.id, i + 1);
  });

  // Build snippet map
  const snippetMap = new Map<string, string>();
  for (const m of brandMatches) {
    snippetMap.set(
      m.brand.id,
      extractSnippet(responseText, m.matchIndex, m.matchLength),
    );
  }

  // Build results for all brands
  return brands.map((brand) => {
    const mentioned = positionMap.has(brand.id);
    return {
      brandId: brand.id,
      mentioned,
      position: mentioned ? positionMap.get(brand.id)! : null,
      contextSnippet: mentioned ? snippetMap.get(brand.id)! : null,
    };
  });
}
