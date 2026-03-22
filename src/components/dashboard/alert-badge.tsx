'use client';

import { useEffect, useState } from 'react';

export function AlertBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function fetchCount() {
      fetch('/api/alerts?unreadOnly=true&limit=100')
        .then((r) => r.json())
        .then((data) => {
          setCount(data.alerts?.length ?? 0);
        })
        .catch(() => {});
    }

    fetchCount();

    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  );
}
