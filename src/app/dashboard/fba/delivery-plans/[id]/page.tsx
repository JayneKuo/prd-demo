import { FbaDeliveryPlansWorkspace } from '@/features/oms/fba-delivery-plans';
export default async function FbaDeliveryPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FbaDeliveryPlansWorkspace detailId={id} />;
}
