'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { HighlightedText } from '@/components/dashboard/highlighted-text';

interface BrandMention {
  brandId: string;
  brandName: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  contextSnippet: string | null;
}

interface Run {
  id: string;
  providerId: string;
  model: string;
  rawResponse: string;
  createdAt: string;
  brandMentions: BrandMention[];
}

interface Brand {
  id: string;
  name: string;
  isOwn: boolean;
  aliases: string[];
}

interface ArchiveData {
  runs: Run[];
  pagination: { page: number; limit: number; total: number };
}

const providerNames: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
};

const sentimentColors: Record<string, string> = {
  positive: 'bg-green-100 text-green-700',
  neutral: 'bg-gray-100 text-gray-600',
  negative: 'bg-red-100 text-red-700',
};

export default function ArchivePage() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('keyword');

  const [page, setPage] = useState(1);
  const [data, setData] = useState<ArchiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((d) => setBrands(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!keyword) return;
    setLoading(true);

    fetch(`/api/dashboard/archive?keyword=${keyword}&page=${page}&limit=20`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [keyword, page]);

  // Build highlight terms from brand names and aliases
  const highlightTerms = brands.flatMap((b) => [b.name, ...b.aliases]);

  const brandNameById = (id: string): string => {
    return brands.find((b) => b.id === id)?.name ?? id;
  };

  const formatDate = (dateStr: string): string => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

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

  const runs = data?.runs ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0 };
  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;

  if (runs.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Response Archive
        </h2>
        <p className="text-gray-400 text-sm py-8 text-center">
          No responses recorded yet for this keyword
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Response Archive
      </h2>

      <div className="space-y-4">
        {runs.map((run) => (
          <div
            key={run.id}
            className="bg-white border border-gray-200 rounded-lg p-5"
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-3 items-center">
                <span className="text-sm font-medium text-gray-900">
                  {providerNames[run.providerId] ?? run.providerId}
                </span>
                <span className="text-xs text-gray-400">{run.model}</span>
              </div>
              <span className="text-xs text-gray-400">
                {formatDate(run.createdAt)}
              </span>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
              <HighlightedText
                text={run.rawResponse}
                highlights={highlightTerms}
              />
            </div>
            {run.brandMentions?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
                {run.brandMentions.map((m) => (
                  <span
                    key={m.brandId}
                    className={`text-xs px-2 py-1 rounded-full ${sentimentColors[m.sentiment ?? 'neutral'] ?? sentimentColors.neutral}`}
                  >
                    {brandNameById(m.brandId)} -- {m.sentiment ?? 'unknown'}{' '}
                    {m.position !== null ? `(#${m.position})` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6">
        <p className="text-sm text-gray-500">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
