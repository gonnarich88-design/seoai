'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { KeywordSelector } from './keyword-selector';

const dataLinks = [
  { label: 'Overview', href: '/dashboard/overview' },
  { label: 'Competitors', href: '/dashboard/competitors' },
  { label: 'Trends', href: '/dashboard/trends' },
  { label: 'Archive', href: '/dashboard/archive' },
];

const managementLinks = [
  { label: 'Keywords', href: '/dashboard/keywords' },
  { label: 'Brands', href: '/dashboard/brands' },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const keywordId = searchParams.get('keyword');

  function linkClassName(href: string) {
    const isActive = pathname === href;
    const base = 'block px-3 py-2 rounded-md text-sm';
    if (isActive) {
      return `${base} bg-gray-200 text-gray-900 font-medium`;
    }
    return `${base} text-gray-600 hover:bg-gray-100 hover:text-gray-900`;
  }

  function dataHref(href: string) {
    if (keywordId) {
      return `${href}?keyword=${keywordId}`;
    }
    return href;
  }

  return (
    <aside className="w-64 border-r border-gray-200 flex flex-col bg-gray-50 shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">SEO AI Monitor</h1>
      </div>
      <KeywordSelector />
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">
          Data
        </p>
        {dataLinks.map((link) => (
          <Link
            key={link.href}
            href={dataHref(link.href)}
            className={linkClassName(link.href)}
          >
            {link.label}
          </Link>
        ))}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3 mt-6">
          Management
        </p>
        {managementLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={linkClassName(link.href)}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
