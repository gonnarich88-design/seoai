'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ScoreCard } from '@/components/dashboard/score-card';
import { CompetitorTable } from '@/components/dashboard/competitor-table';
import { MiniTrendChart } from '@/components/dashboard/mini-trend-chart';

interface Snapshot {
  brandName: string;
  brandId: string;
  providerId: string;
  mentionRate: string | null;
  avgPosition: string | null;
  avgSentiment: string | null;
  date: string | null;
  runCount: number;
}

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
  aliases: string[];
}

const platforms = ['chatgpt', 'perplexity', 'gemini'] as const;

interface ProviderStatus {
  chatgpt: boolean;
  gemini: boolean;
  perplexity: boolean;
}

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('keyword');

  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [trendData, setTrendData] = useState<
    Array<{ date: string; chatgpt: number; perplexity: number; gemini: number }>
  >([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/config/status')
      .then((r) => r.json())
      .then((data) => setProviderStatus(data.providers))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data) => setBrands(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!keyword) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/dashboard/overview?keyword=${keyword}`).then((r) => r.json()),
      fetch(`/api/dashboard/trends?keyword=${keyword}&days=7`).then((r) =>
        r.json(),
      ),
    ])
      .then(([overviewData, trendsData]) => {
        setSnapshots(overviewData.snapshots ?? []);

        // Transform trend data: group by date, pivot providers
        const ownBrand = brands.find((b) => b.isOwn);
        const ownBrandId = ownBrand?.id;
        const filtered = (trendsData.data ?? []).filter(
          (d: TrendRow) => !ownBrandId || d.brandId === ownBrandId,
        );

        const byDate = new Map<
          string,
          { date: string; chatgpt: number; perplexity: number; gemini: number }
        >();
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
        setTrendData(
          Array.from(byDate.values()).sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [keyword, brands]);

  if (!keyword) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">
          Select a keyword from the sidebar to view data
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="text-gray-400 text-sm py-16 text-center">Loading...</p>
    );
  }

  // Find own brand for score cards
  const ownBrand = brands.find((b) => b.isOwn);
  const ownBrandId = ownBrand?.id;

  function getOwnSnapshot(providerId: string): Snapshot | undefined {
    return snapshots.find(
      (s) => s.providerId === providerId && s.brandId === ownBrandId,
    );
  }

  // Add isOwn flag to snapshots for competitor table
  const snapshotsWithOwn = snapshots.map((s) => ({
    ...s,
    isOwn: s.brandId === ownBrandId,
  }));

  const missingProviders = providerStatus
    ? Object.entries(providerStatus)
        .filter(([, hasKey]) => !hasKey)
        .map(([name]) => name)
    : [];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>

      {missingProviders.length > 0 && (
        <div className="mb-6 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          <span className="font-medium">API keys not configured:</span>{' '}
          {missingProviders.join(', ')} — checks for these providers will be skipped.
          {missingProviders.length === 3 && (
            <span className="block mt-1">
              No providers are configured. Set at least one of{' '}
              <code className="font-mono">OPENAI_API_KEY</code>,{' '}
              <code className="font-mono">GOOGLE_GENERATIVE_AI_API_KEY</code>, or{' '}
              <code className="font-mono">PERPLEXITY_API_KEY</code> to start collecting data.
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        {platforms.map((p) => {
          const snap = getOwnSnapshot(p);
          return (
            <ScoreCard
              key={p}
              platform={p}
              mentionRate={snap?.mentionRate ? Number(snap.mentionRate) : null}
              avgPosition={
                snap?.avgPosition ? Number(snap.avgPosition) : null
              }
              avgSentiment={
                snap?.avgSentiment ? Number(snap.avgSentiment) : null
              }
              date={snap?.date ?? null}
              runCount={snap?.runCount ?? 0}
            />
          );
        })}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Competitor Comparison
      </h3>
      <CompetitorTable snapshots={snapshotsWithOwn} />

      <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-8">
        7-Day Trend
      </h3>
      <MiniTrendChart data={trendData} />
    </div>
  );
}
