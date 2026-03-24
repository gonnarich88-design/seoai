'use client';

import { useState, useEffect, useCallback } from 'react';
import { KeywordForm } from '@/components/dashboard/keyword-form';

interface Keyword {
  id: string;
  label: string;
  prompt: string;
  promptVersion: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [runningCheck, setRunningCheck] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);
  const [polling, setPolling] = useState<{ keywordId: string; batchIds: string[]; providerMap: Record<string, string>; startTime: number } | null>(null);

  const loadKeywords = useCallback(async () => {
    try {
      const res = await fetch('/api/keywords');
      if (res.ok) {
        const data = await res.json();
        setKeywords(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  useEffect(() => {
    if (!polling) return;
    const { keywordId, batchIds, providerMap, startTime } = polling;

    const interval = setInterval(async () => {
      try {
        const sr = await fetch(`/api/checks/status?batchIds=${batchIds.join(',')}`);
        const sd = await sr.json();
        const batches: Record<string, { completed: number; failed: boolean; error?: string; providerId?: string }> = sd.batches ?? {};

        const anyComplete = batchIds.some((bid) => (batches[bid]?.completed ?? 0) > 0);
        const anyFailed = batchIds.some((bid) => batches[bid]?.failed);
        const allResolved = batchIds.every(
          (bid) => batches[bid]?.failed || (batches[bid]?.completed ?? 0) > 0,
        );
        const elapsed = Date.now() - startTime;

        const showFailures = () => {
          const lines = batchIds.map((bid) => {
            const provider = providerMap[bid] ?? batches[bid]?.providerId ?? bid;
            if (batches[bid]?.failed && batches[bid]?.error) return `• ${provider}: ${batches[bid].error}`;
            if ((batches[bid]?.completed ?? 0) > 0) return null;
            return `• ${provider}: ยังประมวลผลอยู่`;
          }).filter(Boolean);
          const msg = `Check failed:\n${lines.join('\n')}`;
          setCheckResult({ id: keywordId, message: msg, type: 'error' });
          setPolling(null);
        };

        if (anyComplete) {
          setCheckResult({ id: keywordId, message: 'Check complete — results are now in Overview.', type: 'success' });
          setPolling(null);
        } else if (allResolved) {
          showFailures();
        } else if (anyFailed && elapsed > 20_000) {
          showFailures();
        } else if (elapsed > 90_000) {
          setCheckResult({ id: keywordId, message: 'Check is taking longer than expected — results will appear in Overview when ready.', type: 'success' });
          setPolling(null);
        }
      } catch {
        // keep polling on transient fetch errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [polling]);

  async function handleToggle(k: Keyword) {
    await fetch(`/api/keywords/${k.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !k.isActive }),
    });
    loadKeywords();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this keyword?')) return;
    await fetch(`/api/keywords/${id}`, { method: 'DELETE' });
    loadKeywords();
  }

  async function handleRunCheck(id: string) {
    setRunningCheck(id);
    setCheckResult(null);
    try {
      const res = await fetch('/api/checks/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckResult({ id, message: data.error || 'Failed to queue check.', type: 'error' });
        return;
      }

      const queued = (data.results ?? []).filter((r: { status: string; batchId: string | null }) => r.status === 'queued' && r.batchId);
      const batchIds: string[] = queued.map((r: { batchId: string }) => r.batchId);
      const providerMap: Record<string, string> = {};
      for (const r of queued) providerMap[r.batchId] = r.providerId;

      if (batchIds.length === 0) {
        setCheckResult({ id, message: data.message || 'No providers available to run check.', type: 'error' });
        return;
      }

      setCheckResult({ id, message: 'Queued — checking status…', type: 'success' });
      setPolling({ keywordId: id, batchIds, providerMap, startTime: Date.now() });
    } finally {
      setRunningCheck(null);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Keywords</h2>
        <button
          onClick={() => {
            setEditingKeyword(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Add Keyword
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading...</p>
        ) : keywords.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">
            No keywords yet. Add your first keyword to start tracking.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Label
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Prompt
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Version
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((k) => (
                <tr key={k.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {k.label}
                  </td>
                  <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                    {k.prompt}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-500">
                    v{k.promptVersion}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggle(k)}
                      className={
                        k.isActive
                          ? 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-700'
                          : 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500'
                      }
                    >
                      {k.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right space-x-3">
                    <button
                      onClick={() => handleRunCheck(k.id)}
                      disabled={runningCheck === k.id || !k.isActive}
                      className="text-emerald-600 hover:text-emerald-800 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      title={!k.isActive ? 'Enable keyword to run check' : 'Run check now'}
                    >
                      {runningCheck === k.id ? 'Queuing…' : 'Run Check'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingKeyword(k);
                        setShowForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(k.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {checkResult && (
        <div
          className={`mt-4 px-4 py-3 rounded-md text-sm border ${
            checkResult.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {checkResult.message.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {showForm && (
        <KeywordForm
          keyword={editingKeyword}
          onClose={() => setShowForm(false)}
          onSaved={loadKeywords}
        />
      )}
    </div>
  );
}
