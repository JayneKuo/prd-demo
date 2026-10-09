import { redirect } from 'next/navigation';

/**
 * 结算单功能已并入"应收账款"
 * 渠道打款追踪 → /dashboard/receivables（结算对账 Tab）
 */
export default function SettlementPage() {
  redirect('/dashboard/receivables');
}
