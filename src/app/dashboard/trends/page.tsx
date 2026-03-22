'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TrendChart } from '@/components/dashboard/trend-chart';

interface TrendRow {
  date: string;
  providerId: string;
  mentionRate: string | null;
  brandId: string;
}

interface Brand {
  id: string;
  name: string;
  isOwn: boolean;
}

interface ChartPoint {
  date: string;
  chatgpt: number;
  perplexity: number;
  gemini: number;
}

const dayOptions = [7, 14, 30, 60, 90] as const;

export default function TrendsPage() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('keyword');

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data) => setBrands(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!keyword) return;
    setLoading(true);

    const brandParam = selectedBrand ? `&brand=${selectedBrand}` : '';
    fetch(`/api/dashboard/trends?keyword=${keyword}&days=${days}${brandParam}`)
      .then((r) => r.json())
      .then((data) => {
        const rows: TrendRow[] = data.data ?? [];

        // If no brand selected, filter to own brand only
        let filtered = rows;
        if (!selectedBrand) {
          const ownBrand = brands.find((b) => b.isOwn);
          if (ownBrand) {
            filtered = rows.filter((r) => r.brandId === ownBrand.id);
          }
        }

        // Transform: group by date, pivot providers
        const byDate = new Map<string, ChartPoint>();
        for (const row of filtered) {
          if (!byDate.has(row.date)) {
            byDate.set(row.date, {
              date: row.date,
              chatgpt: 0,
              perplexity: 0,
              gemini: 0,
            });
          }
          const entry = byDate.get(row.date)!;
          const rate = row.mentionRate
            ? Math.round(Number(row.mentionRate) * 100)
            : 0;
          if (row.providerId === 'chatgpt') entry.chatgpt = rate;
          if (row.providerId === 'perplexity') entry.perplexity = rate;
          if (row.providerId === 'gemini') entry.gemini = rate;
        }

        setChartData(
          Array.from(byDate.values()).sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [keyword, selectedBrand, days, brands]);

  if (!keyword) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">
          Select a keyword from the sidebar to view data
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Trends</h2>

      <div className="flex gap-4 mb-6">
        <select
          value={selectedBrand ?? ''}
          onChange={(e) =>
            setSelectedBrand(e.target.value || null)
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Own brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {loading ? (
          <p className="text-gray-400 text-sm py-16 text-center">Loading...</p>
        ) : (
          <TrendChart data={chartData} />
        )}
      </div>
    </div>
  );
}
