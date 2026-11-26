'use client';

import { useParams } from 'next/navigation';
import { FbaWorkspace } from '@/features/oms/fba-workspace';

export default function FbaInboundPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <FbaWorkspace mode="inbound-plans" detailId={id} />;
}
