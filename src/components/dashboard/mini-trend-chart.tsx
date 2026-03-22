'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface MiniTrendChartProps {
  data: Array<{
    date: string;
    chatgpt: number;
    perplexity: number;
    gemini: number;
  }>;
}

export function MiniTrendChart({ data }: MiniTrendChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-gray-400 text-sm py-8 text-center">
        No trend data yet
      </p>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(v) => `${v}%`} />
          <Line
            type="monotone"
            dataKey="chatgpt"
            stroke="#10b981"
            name="ChatGPT"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="perplexity"
            stroke="#3b82f6"
            name="Perplexity"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="gemini"
            stroke="#8b5cf6"
            name="Gemini"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
