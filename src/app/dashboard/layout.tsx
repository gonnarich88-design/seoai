'use client';

import { Suspense } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <div className="flex h-screen bg-white">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-white">{children}</main>
      </div>
    </Suspense>
  );
}
