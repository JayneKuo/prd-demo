/**
 * 亚马逊 FBM 出库单时效预警工具
 *
 * urgencyLevel 规则（基于 shipByDate 与当前时间的差值）：
 *   normal   — 剩余 > 24h
 *   warning  — 剩余 ≤ 24h
 *   critical — 剩余 ≤ 4h
 *   overdue  — 已超过截止时间
 *
 * 注意：已发货（status 为 '已出库' 或存在 shippedAt）时不展示预警。
 */

export type UrgencyLevel = 'normal' | 'warning' | 'critical' | 'overdue';

export interface UrgencyInfo {
  level: UrgencyLevel;
  /** 剩余时间文案，如 "剩余 18h"，超期则为 "已超期 2h" */
  label: string;
  /** 距截止的毫秒数（负数表示已超期） */
  diffMs: number;
}

/**
 * 根据 shipByDate 计算当前时效状态。
 * @param shipByDate ISO 8601 格式的截止时间字符串
 * @param shipped    是否已发货（已发货时返回 null，不展示预警）
 * @param now        可选，当前时间戳（ms）；不传则用 Date.now()
 */
export function getUrgencyInfo(
  shipByDate: string | undefined,
  shipped: boolean,
  now?: number
): UrgencyInfo | null {
  if (!shipByDate || shipped) return null;

  const ts = now ?? Date.now();
  const deadline = new Date(shipByDate).getTime();
  const diffMs = deadline - ts;
  const diffH = diffMs / 1000 / 3600;

  let level: UrgencyLevel;
  if (diffMs < 0) {
    level = 'overdue';
  } else if (diffH <= 4) {
    level = 'critical';
  } else if (diffH <= 24) {
    level = 'warning';
  } else {
    level = 'normal';
  }

  const absH = Math.abs(diffH);
  let label: string;
  if (diffMs < 0) {
    if (absH < 1) {
      label = `超期 ${Math.round(absH * 60)}m`;
    } else {
      label = `超期 ${absH.toFixed(0)}h`;
    }
  } else {
    if (absH < 1) {
      label = `剩余 ${Math.round(absH * 60)}m`;
    } else {
      label = `剩余 ${absH.toFixed(0)}h`;
    }
  }

  return { level, label, diffMs };
}

/** urgencyLevel → Tailwind class 映射 */
export const urgencyStyles: Record<UrgencyLevel, string> = {
  normal:   'bg-green-50 text-green-700 ring-green-200',
  warning:  'bg-yellow-50 text-yellow-700 ring-yellow-200',
  critical: 'bg-orange-50 text-orange-700 ring-orange-200',
  overdue:  'bg-red-50 text-red-700 ring-red-200',
};

export const urgencyIcons: Record<UrgencyLevel, string> = {
  normal:   '✓',
  warning:  '⏰',
  critical: '⚠️',
  overdue:  '🔴',
};
