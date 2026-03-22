'use client';

interface HighlightedTextProps {
  text: string;
  highlights: string[];
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function HighlightedText({ text, highlights }: HighlightedTextProps) {
  if (highlights.length === 0) {
    return <span>{text}</span>;
  }

  const pattern = new RegExp(
    `(${highlights.map(escapeRegExp).join('|')})`,
    'gi',
  );

  const parts = text.split(pattern);

  return (
    <span>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="bg-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
