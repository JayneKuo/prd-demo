import { redirect } from 'next/navigation';

/**
 * 费用管理已并入"应付账款"
 * 仓储 / 运输 / 平台 / 广告费账单 → /dashboard/payables
 */
export default function ExpensesPage() {
  redirect('/dashboard/payables');
}
