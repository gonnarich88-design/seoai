'use client';

import { useState, useEffect, FormEvent } from 'react';

interface BrandFormProps {
  brand?: {
    id: string;
    name: string;
    aliases: string[];
    isOwn: boolean;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

export function BrandForm({ brand, onClose, onSaved }: BrandFormProps) {
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState('');
  const [isOwn, setIsOwn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setAliases([...brand.aliases]);
      setIsOwn(brand.isOwn);
    }
  }, [brand]);

  function addAlias() {
    const trimmed = aliasInput.trim();
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases([...aliases, trimmed]);
      setAliasInput('');
    }
  }

  function removeAlias(index: number) {
    setAliases(aliases.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = brand ? `/api/brands/${brand.id}` : '/api/brands';
      const method = brand ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, aliases, isOwn }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error?.formErrors?.[0] ||
            data.error?.fieldErrors?.name?.[0] ||
            'Failed to save brand',
        );
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
          {brand ? 'Edit Brand' : 'Add Brand'}
        </h3>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Inc"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
          />

          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={isOwn}
              onChange={(e) => setIsOwn(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              This is my own brand
            </span>
          </label>

          <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
            Aliases
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="Add alias..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAlias();
                }
              }}
            />
            <button
              type="button"
              onClick={addAlias}
              className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {aliases.map((alias, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-sm rounded-md"
              >
                {alias}
                <button
                  type="button"
                  onClick={() => removeAlias(i)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>

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
