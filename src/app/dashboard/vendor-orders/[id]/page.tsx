'use client';
import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { VendorWorkspace } from '@/features/oms/vendor-workspace';
export default function Page() { const { id } = useParams<{ id: string }>(); return <Suspense fallback={<p className="p-6">正在读取采购订单…</p>}><VendorWorkspace detailId={id} /></Suspense>; }
