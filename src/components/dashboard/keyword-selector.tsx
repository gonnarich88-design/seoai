'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface Keyword {
  id: string;
  label: string;
  isActive: boolean;
}

export function KeywordSelector() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentKeyword = searchParams.get('keyword') ?? '';

  useEffect(() => {
    fetch('/api/keywords')
      .then((res) => res.json())
      .then((data: Keyword[]) => {
        setKeywords(data.filter((k) => k.isActive));
      })
      .catch(() => {
        // Silently handle fetch errors
      });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('keyword', value);
    } else {
      params.delete('keyword');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="p-4 border-b border-gray-200">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
        Keyword
      </p>
      <select
        value={currentKeyword}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
      >
        <option value="">Select keyword...</option>
        {keywords.map((k) => (
          <option key={k.id} value={k.id}>
            {k.label}
          </option>
        ))}
      </select>
    </div>
  );
}
