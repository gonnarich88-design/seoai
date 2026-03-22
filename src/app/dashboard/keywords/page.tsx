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
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setEditingKeyword(k);
                        setShowForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
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
