'use client';

import { formatDistanceToNow } from 'date-fns';

interface AlertData {
  id: string;
  alertType: string;
  previousValue: unknown;
  currentValue: unknown;
  isRead: boolean;
  createdAt: string;
  notifiedAt: string | null;
}

interface AlertCardProps {
  alert: AlertData;
  keywordLabel: string;
  brandName: string;
  onMarkRead: (id: string) => void;
}

const alertTypeLabels: Record<string, string> = {
  brand_appeared: 'Brand Appeared',
  brand_disappeared: 'Brand Disappeared',
  rank_changed: 'Rank Changed',
  visibility_changed: 'Visibility Changed',
};

const alertTypeColors: Record<string, string> = {
  brand_appeared: 'border-green-500 bg-green-50 text-green-700',
  brand_disappeared: 'border-red-500 bg-red-50 text-red-700',
  rank_changed: 'border-blue-500 bg-blue-50 text-blue-700',
  visibility_changed: 'border-blue-500 bg-blue-50 text-blue-700',
};

const alertBorderColors: Record<string, string> = {
  brand_appeared: 'border-l-green-500',
  brand_disappeared: 'border-l-red-500',
  rank_changed: 'border-l-blue-500',
  visibility_changed: 'border-l-blue-500',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') return String(value);
  return String(value);
}

export function AlertCard({ alert, keywordLabel, brandName, onMarkRead }: AlertCardProps) {
  const typeLabel = alertTypeLabels[alert.alertType] ?? alert.alertType;
  const badgeColor = alertTypeColors[alert.alertType] ?? 'border-gray-500 bg-gray-50 text-gray-700';
  const borderColor = alertBorderColors[alert.alertType] ?? 'border-l-gray-500';

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true });
    } catch {
      return alert.createdAt;
    }
  })();

  return (
    <div
      className={`border border-gray-200 rounded-lg p-4 border-l-4 ${borderColor} ${
        alert.isRead ? 'bg-gray-50' : 'bg-white'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}
            >
              {typeLabel}
            </span>
            <span className={`text-xs ${alert.isRead ? 'text-gray-400' : 'text-gray-500'}`}>
              {timeAgo}
            </span>
          </div>
          <p className={`text-sm font-medium ${alert.isRead ? 'text-gray-500' : 'text-gray-900'}`}>
            {brandName}
          </p>
          <p className={`text-xs ${alert.isRead ? 'text-gray-400' : 'text-gray-500'}`}>
            {keywordLabel}
          </p>
          <p className={`text-xs mt-1 ${alert.isRead ? 'text-gray-400' : 'text-gray-600'}`}>
            {formatValue(alert.previousValue)} &rarr; {formatValue(alert.currentValue)}
          </p>
        </div>
        {!alert.isRead && (
          <button
            onClick={() => onMarkRead(alert.id)}
            className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap ml-4"
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
}
