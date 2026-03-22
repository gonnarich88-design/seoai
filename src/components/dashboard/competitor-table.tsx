interface Snapshot {
  brandName: string;
  brandId: string;
  providerId: string;
  mentionRate: number | string | null;
  avgPosition: number | string | null;
  isOwn?: boolean;
}

interface CompetitorTableProps {
  snapshots: Snapshot[];
}

const providers = ['chatgpt', 'perplexity', 'gemini'] as const;

export function CompetitorTable({ snapshots }: CompetitorTableProps) {
  if (snapshots.length === 0) {
    return (
      <p className="text-gray-400 text-sm py-8 text-center">
        No competitor data yet
      </p>
    );
  }

  // Group by brandName, pivot by providerId
  const brandMap = new Map<
    string,
    {
      brandName: string;
      isOwn: boolean;
      providers: Record<string, number | string | null>;
    }
  >();

  for (const snap of snapshots) {
    if (!brandMap.has(snap.brandName)) {
      brandMap.set(snap.brandName, {
        brandName: snap.brandName,
        isOwn: snap.isOwn ?? false,
        providers: {},
      });
    }
    const entry = brandMap.get(snap.brandName)!;
    entry.providers[snap.providerId] = snap.mentionRate;
  }

  const rows = Array.from(brandMap.values()).sort((a, b) => {
    // Own brand first
    if (a.isOwn && !b.isOwn) return -1;
    if (!a.isOwn && b.isOwn) return 1;
    return a.brandName.localeCompare(b.brandName);
  });

  function formatRate(val: number | string | null | undefined): string {
    if (val === null || val === undefined) return '--';
    return `${Math.round(Number(val) * 100)}%`;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
            Brand
          </th>
          <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">
            ChatGPT
          </th>
          <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">
            Perplexity
          </th>
          <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">
            Gemini
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.brandName}
            className={row.isOwn ? 'bg-blue-50' : undefined}
          >
            <td
              className={`py-3 px-4 ${row.isOwn ? 'font-bold' : ''} text-gray-900`}
            >
              {row.brandName}
            </td>
            {providers.map((p) => (
              <td key={p} className="py-3 px-4 text-center text-gray-700">
                {formatRate(row.providers[p])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
