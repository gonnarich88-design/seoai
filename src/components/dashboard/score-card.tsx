interface ScoreCardProps {
  platform: string;
  mentionRate: number | null;
  avgPosition: number | null;
  avgSentiment: number | null;
  date: string | null;
  runCount: number;
}

const platformNames: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
};

const platformColors: Record<string, string> = {
  chatgpt: 'border-t-emerald-500',
  perplexity: 'border-t-blue-500',
  gemini: 'border-t-violet-500',
};

export function ScoreCard({
  platform,
  mentionRate,
  avgPosition: _avgPosition,
  avgSentiment: _avgSentiment,
  date,
  runCount: _runCount,
}: ScoreCardProps) {
  const displayName = platformNames[platform] ?? platform;
  const colorClass = platformColors[platform] ?? 'border-t-gray-500';

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-5 border-t-4 ${colorClass}`}
    >
      <p className="text-sm font-medium text-gray-500">{displayName}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">
        {mentionRate !== null
          ? `${Math.round(Number(mentionRate) * 100)}%`
          : '--'}
      </p>
      <p className="text-xs text-gray-400 mt-1">Visibility Score</p>
      <p className="text-xs text-gray-400 mt-3">
        {date ? `Last check: ${date}` : 'No data yet'}
      </p>
    </div>
  );
}
