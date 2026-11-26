import { Suspense } from 'react';
import { VendorWorkspace } from '@/features/oms/vendor-workspace';
export default function Page() { return <Suspense fallback={<p className="p-6">正在读取采购订单…</p>}><VendorWorkspace /></Suspense>; }
