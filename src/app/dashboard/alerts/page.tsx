'use client';

import { useEffect, useState } from 'react';
import { AlertCard } from '@/components/dashboard/alert-card';

interface AlertRow {
  id: string;
  alertType: string;
  previousValue: unknown;
  currentValue: unknown;
  isRead: boolean;
  createdAt: string;
  notifiedAt: string | null;
}

interface AlertEntry {
  alert: AlertRow;
  keyword: { id: string; label: string } | null;
  brand: { id: string; name: string } | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  function fetchAlerts() {
    setLoading(true);
    const params = filter === 'unread' ? '?limit=100&unreadOnly=true' : '?limit=100';
    fetch(`/api/alerts${params}`)
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleMarkRead(id: string) {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertIds: [id] }),
    });
    fetchAlerts();
  }

  async function handleMarkAllRead() {
    const unreadIds = alerts
      .filter((a) => !a.alert.isRead)
      .map((a) => a.alert.id);
    if (unreadIds.length === 0) return;
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertIds: unreadIds }),
    });
    fetchAlerts();
  }

  const unreadCount = alerts.filter((a) => !a.alert.isRead).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Alerts</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-sm ${
                filter === 'unread'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Unread Only
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm py-16 text-center">Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <p className="text-gray-400 text-sm py-16 text-center">
          No alerts yet. Alerts will appear here when visibility changes are detected.
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((entry) => (
            <AlertCard
              key={entry.alert.id}
              alert={entry.alert}
              keywordLabel={entry.keyword?.label ?? 'Unknown keyword'}
              brandName={entry.brand?.name ?? 'Unknown brand'}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
