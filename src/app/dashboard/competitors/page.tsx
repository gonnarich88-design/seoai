'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CompetitorTable } from '@/components/dashboard/competitor-table';

interface Snapshot {
  brandName: string;
  brandId: string;
  providerId: string;
  mentionRate: string | null;
  avgPosition: string | null;
}

interface Brand {
  id: string;
  name: string;
  isOwn: boolean;
}

export default function CompetitorsPage() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('keyword');

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
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

    fetch(`/api/dashboard/overview?keyword=${keyword}`)
      .then((r) => r.json())
      .then((data) => setSnapshots(data.snapshots ?? []))
      .finally(() => setLoading(false));
  }, [keyword]);

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

  const ownBrand = brands.find((b) => b.isOwn);
  const ownBrandId = ownBrand?.id;

  const snapshotsWithOwn = snapshots.map((s) => ({
    ...s,
    isOwn: s.brandId === ownBrandId,
  }));

  // Summary stats
  const uniqueBrands = new Set(snapshots.map((s) => s.brandName)).size;
  const ownSnapshots = snapshots.filter((s) => s.brandId === ownBrandId);
  const ownAvgVisibility =
    ownSnapshots.length > 0
      ? Math.round(
          (ownSnapshots.reduce(
            (acc, s) => acc + (s.mentionRate ? Number(s.mentionRate) : 0),
            0,
          ) /
            ownSnapshots.length) *
            100,
        )
      : null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Competitor Comparison
      </h2>

      <CompetitorTable snapshots={snapshotsWithOwn} />

      <div className="flex gap-6 mt-6 text-sm text-gray-500">
        <p>
          Brands tracked: <span className="font-medium text-gray-900">{uniqueBrands}</span>
        </p>
        {ownAvgVisibility !== null && (
          <p>
            Own brand avg visibility:{' '}
            <span className="font-medium text-gray-900">{ownAvgVisibility}%</span>
          </p>
        )}
      </div>
    </div>
  );
}
