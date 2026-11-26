import { Suspense } from 'react';
import { InboundPlanCreate } from '@/features/oms/inbound-plan-create';

export default function NewInboundPlanPage() {
  return (
    <Suspense fallback={<p className="p-6">正在加载入库计划表单…</p>}>
      <InboundPlanCreate />
    </Suspense>
  );
}
