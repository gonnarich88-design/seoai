/**
 * Generic CSV serialization utility.
 *
 * Produces RFC-4180-compliant CSV: all fields quoted, double-quotes escaped
 * by doubling, null/undefined rendered as empty string.
 */

function escapeField(value: unknown): string {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function serializeCsv(params: {
  headers: string[];
  rows: Record<string, unknown>[];
}): string {
  const { headers, rows } = params;
  const headerLine = headers.join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeField(row[h])).join(','),
  );
  return [headerLine, ...dataLines].join('\n');
}
