'use client';

import { useState, useEffect, useCallback } from 'react';
import { BrandForm } from '@/components/dashboard/brand-form';

interface Brand {
  id: string;
  name: string;
  aliases: string[];
  isOwn: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const loadBrands = useCallback(async () => {
    try {
      const res = await fetch('/api/brands');
      if (res.ok) {
        const data = await res.json();
        setBrands(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this brand?')) return;
    await fetch(`/api/brands/${id}`, { method: 'DELETE' });
    loadBrands();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Brands</h2>
        <button
          onClick={() => {
            setEditingBrand(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Add Brand
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading...</p>
        ) : brands.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">
            No brands yet. Add your brand and competitors to start tracking.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Brand
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Aliases
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {b.name}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {b.aliases.length > 0 ? (
                      b.aliases.join(', ')
                    ) : (
                      <span className="text-gray-300">--</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {b.isOwn ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                        Own
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">
                        Competitor
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setEditingBrand(b);
                        setShowForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
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
        <BrandForm
          brand={editingBrand}
          onClose={() => setShowForm(false)}
          onSaved={loadBrands}
        />
      )}
    </div>
  );
}
