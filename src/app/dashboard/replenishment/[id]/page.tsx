'use client';

import { useParams } from 'next/navigation';
import { ReplenishmentDetail } from '@/features/oms/replenishment-detail';

export default function ReplenishmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  // useParams 在部分版本返回未解码字符串，统一解码一次
  const decoded = decodeURIComponent(id ?? '');
  return <ReplenishmentDetail type="plan" id={decoded} />;
}
