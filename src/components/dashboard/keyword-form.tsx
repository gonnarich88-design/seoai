'use client';

import { useState, useEffect, FormEvent } from 'react';

interface KeywordFormProps {
  keyword?: {
    id: string;
    label: string;
    prompt: string;
    isActive: boolean;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

export function KeywordForm({ keyword, onClose, onSaved }: KeywordFormProps) {
  const [label, setLabel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (keyword) {
      setLabel(keyword.label);
      setPrompt(keyword.prompt);
    }
  }, [keyword]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = keyword
        ? `/api/keywords/${keyword.id}`
        : '/api/keywords';
      const method = keyword ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, prompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.formErrors?.[0] || data.error?.fieldErrors?.label?.[0] || data.error?.fieldErrors?.prompt?.[0] || 'Failed to save keyword');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {keyword ? 'Edit Keyword' : 'Add Keyword'}
        </h3>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Best CRM software"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
          />

          <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="e.g. What is the best CRM software for small businesses?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
          />

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
