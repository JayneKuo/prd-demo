import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildStageCopyText } from '@/features/developer-logs/format';
import {
  inventoryLogRows,
  purchaseInboundLogRows,
  salesOrderLogRows,
  transferLogRows
} from '@/features/developer-logs/mock-data';
import { LogsPageClient } from '@/features/developer-logs/logs-page-client';
import type { EventLogRow } from '@/features/developer-logs/types';

const logsPageClientWithCopy = LogsPageClient as typeof LogsPageClient & {
  copyInboundRawData: (row: EventLogRow, clipboard?: { writeText: (value: string) => Promise<void> | void }) => Promise<void>;
  copyOutboundRawData: (row: EventLogRow, clipboard?: { writeText: (value: string) => Promise<void> | void }) => Promise<void>;
  copyEventDetails: (row: EventLogRow, clipboard?: { writeText: (value: string) => Promise<void> | void }) => Promise<void>;
};

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
});

describe('LogsPageClient', () => {
  it('renders OMS event-log fields in the list', () => {
    const html = renderToStaticMarkup(
      createElement(LogsPageClient, {
        title: '销售订单 / 出库日志',
        description: '查看订单、履约、Shipment 与同步事件日志。',
        rows: salesOrderLogRows
      })
    );

    expect(html).toContain('销售订单 / 出库日志');
    expect(html).toContain('Execution Result');
    expect(html).toContain('Channel Sales Order No.');
    expect(html).toContain('OMS SO No.');
    expect(html).toContain('Purchase Order No.');
    expect(html).toContain('PO No.');
    expect(html).toContain('Transfer Order No.');
    expect(html).toContain('Reference No.');
    expect(html).toContain('Shipment Synchronization');
    expect(html).toContain('AMZ-77881');
    expect(html).toContain('SO-10024');
    expect(html).toContain('REF-SHP-10024');
  });

  it('renders OMS event-log drawer sections', () => {
    const html = renderToStaticMarkup(
      createElement(LogsPageClient, {
        title: '销售订单 / 出库日志',
        description: '查看订单、履约、Shipment 与同步事件日志。',
        rows: salesOrderLogRows,
        initialSelectedId: salesOrderLogRows[0].id
      })
    );

    expect(html).toContain('Overview');
    expect(html).toContain('Related Business Numbers');
    expect(html).toContain('Inbound Raw Data');
    expect(html).toContain('Normalized OMS Data');
    expect(html).toContain('Outbound Raw Data');
    expect(html).toContain('Response Data');
    expect(html).toContain('Error Details');
    expect(html).toContain('Attempts');
  });

  it('shows Re-push for failed outbound rows and Re-consume for failed inbound or internal rows', () => {
    const salesHtml = renderToStaticMarkup(
      createElement(LogsPageClient, {
        title: '销售订单 / 出库日志',
        description: '查看订单、履约、Shipment 与同步事件日志。',
        rows: salesOrderLogRows,
        initialSelectedId: salesOrderLogRows[0].id
      })
    );
    const purchaseHtml = renderToStaticMarkup(
      createElement(LogsPageClient, {
        title: 'PO / 入库日志',
        description: '查看采购与入库事件日志。',
        rows: purchaseInboundLogRows,
        initialSelectedId: purchaseInboundLogRows[0].id
      })
    );

    expect(salesHtml).toContain('Re-push');
    expect(purchaseHtml).toContain('Re-consume');
  });

  it('filters rows by keyword and trace id-like values', () => {
    const html = renderToStaticMarkup(
      createElement(LogsPageClient, {
        title: '调拨日志',
        description: '查看调拨事件日志。',
        rows: transferLogRows,
        initialQuery: 'trace_trf_001'
      })
    );

    expect(html).toContain('Transfer Completion');
    expect(html).not.toContain('Transfer Order Update');
  });

  it('renders attempt history and action labels', () => {
    const html = renderToStaticMarkup(
      createElement(LogsPageClient, {
        title: '库存日志',
        description: '查看库存事件日志。',
        rows: inventoryLogRows,
        initialSelectedId: inventoryLogRows[0].id
      })
    );

    expect(html).toContain('View Attempts');
    expect(html).toContain('Manual Re-push');
    expect(html).toContain('Scheduled Retry');
  });

  it('renders close control when drawer is open', () => {
    const html = renderToStaticMarkup(
      createElement(LogsPageClient, {
        title: '销售订单 / 出库日志',
        description: '查看订单、履约、Shipment 与同步事件日志。',
        rows: salesOrderLogRows,
        initialSelectedId: salesOrderLogRows[0].id
      })
    );

    expect(html).toContain('Close Trace Detail');
  });

  it('copies raw inbound data, outbound data, and composed event details through helper callbacks', async () => {
    const row = salesOrderLogRows[0];
    const clipboard = { writeText };

    await logsPageClientWithCopy.copyInboundRawData(row, clipboard);
    await logsPageClientWithCopy.copyOutboundRawData(row, clipboard);
    await logsPageClientWithCopy.copyEventDetails(row, clipboard);

    expect(writeText).toHaveBeenNthCalledWith(1, row.inboundRawData.raw);
    expect(writeText).toHaveBeenNthCalledWith(2, row.outboundRawData.raw);
    expect(writeText).toHaveBeenNthCalledWith(3, buildStageCopyText(row));
  });
});
