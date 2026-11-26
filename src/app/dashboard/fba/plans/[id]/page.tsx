'use client';

import { useParams } from 'next/navigation';
import { FbaWorkspace } from '@/features/oms/fba-workspace';

export default function FbaPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <FbaWorkspace mode="plans" detailId={id} />;
}
