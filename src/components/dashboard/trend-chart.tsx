'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendChartProps {
  data: Array<{
    date: string;
    chatgpt: number;
    perplexity: number;
    gemini: number;
  }>;
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-gray-400 text-sm py-16 text-center">
        No trend data available
      </p>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          <Line
            type="monotone"
            dataKey="chatgpt"
            stroke="#10b981"
            name="ChatGPT"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="perplexity"
            stroke="#3b82f6"
            name="Perplexity"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="gemini"
            stroke="#8b5cf6"
            name="Gemini"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
