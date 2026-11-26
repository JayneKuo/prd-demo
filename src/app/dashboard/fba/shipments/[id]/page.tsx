'use client';

import { useParams } from 'next/navigation';
import { FbaWorkspace } from '@/features/oms/fba-workspace';

export default function FbaShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <FbaWorkspace mode="shipments" detailId={id} />;
}
