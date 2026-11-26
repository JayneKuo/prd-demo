'use client';

import { useParams } from 'next/navigation';
import { ReplenishmentDetail } from '@/features/oms/replenishment-detail';

export default function InboundOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ReplenishmentDetail type="inbound-order" id={id} />;
}
