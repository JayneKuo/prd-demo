import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const f = join(__dirname, '../src/lib/mock-data/order-details-extra.ts');
let content = readFileSync(f, 'utf8');

// 先清掉所有错误插入的 profitability（在 customer 对象内的）
// 特征：紧跟在 customer 对象属性后，以 "      profitability:" 开头（6空格）
content = content.replace(/,\n\s{6}profitability: \{[\s\S]*?additionalFees: \[\],\n\s{8}tags:/g, (match) => {
  // 只保留最后的 tags 行内容
  const tagsIdx = match.lastIndexOf('tags:');
  return '\n        tags:';
});

// 写回文件
writeFileSync(f, content, 'utf8');
console.log('Cleanup done');

const map = {
  so_002: { wc: 2.80, fc: 0, complete: false, note: '运输成本待 TMS 回传' },
  so_003: { wc: 0, fc: 0, complete: false, note: '等待地址确认，未发货' },
  so_004: { wc: 0, fc: 0, complete: false, note: '支付未确认，未进入履约' },
  so_005: { wc: 2.40, fc: 0, complete: false, note: '运输成本待 TMS 回传' },
  so_006: { wc: 0, fc: 0, complete: false, note: '未发货，成本待回传' },
  so_008: { wc: 18.50, fc: 128.00, complete: true },
  so_009: { wc: 0, fc: 0, complete: true },
  so_010: { wc: 12.00, fc: 24.00, complete: true },
  so_011: { wc: 3.20, fc: 12.00, complete: true },
  so_012: { wc: 2.80, fc: 6.00, complete: true },
  so_013: { wc: 4.50, fc: 0, complete: false, note: '运输成本待 TMS 回传' },
  so_014: { wc: 0, fc: 0, complete: false, note: '未发货，等待人工处理' },
  so_015: { wc: 6.80, fc: 0, complete: false, note: '部分发货，运输成本待回传' },
  so_016: { wc: 4.20, fc: 18.00, complete: false, note: '合规暂停，部分成本待确认' },
  so_017: { wc: 3.60, fc: 22.00, complete: true },
  so_018: { wc: 4.00, fc: 16.00, complete: true },
  so_019: { wc: 38.00, fc: 480.00, complete: true },
  so_020: { wc: 12.00, fc: 220.00, complete: true },
  so_021: { wc: 0, fc: 0, complete: false, note: 'SKU未识别，未发货' },
  so_022: { wc: 0, fc: 0, complete: false, note: '仓库SKU未映射，未发货' },
  so_023: { wc: 0, fc: 0, complete: false, note: 'WMS货品不存在，未发货' },
  so_024: { wc: 0, fc: 0, complete: false, note: '风控拦截，未发货' },
  so_025: { wc: 0, fc: 0, complete: false, note: '渠道SKU未映射，未发货' },
  so_026: { wc: 22.00, fc: 0, complete: false, note: 'LTL运输成本待承运商账单' },
  so_027: { wc: 3.20, fc: 14.00, complete: false, note: 'COD货到付款，支付未确认' },
  so_028: { wc: 28.00, fc: 0, complete: false, note: 'B2B分批发货，运输成本待汇总' },
  so_029: { wc: 8.00, fc: 32.00, complete: true },
};

let count = 0;
for (const [orderId, p] of Object.entries(map)) {
  const profBlock = p.complete
    ? `    profitability: {\n      warehouseCost: ${p.wc},\n      freightCost: ${p.fc},\n      costComplete: true,\n      currency: 'USD',\n    },\n    additionalFees: [],\n    `
    : `    profitability: {\n      warehouseCost: ${p.wc},\n      freightCost: ${p.fc},\n      costComplete: false,\n      costPendingNote: '${p.note}',\n      currency: 'USD',\n    },\n    additionalFees: [],\n    `;

  // Find the order block: from "  so_XXX:" to next "  so_" or end of object
  // Strategy: replace "    tags: [" AFTER "id: 'so_XXX'" with profBlock + "    tags: ["
  // Use split approach per order
  const marker = `id: '${orderId}'`;
  const idx = content.indexOf(marker);
  if (idx === -1) { console.log(`NOT FOUND: ${orderId}`); continue; }

  // Find next "    tags: [" after this order
  const tagsIdx = content.indexOf("    tags: [", idx);
  if (tagsIdx === -1) { console.log(`NO TAGS: ${orderId}`); continue; }

  // Check if profitability already exists between idx and tagsIdx
  const segment = content.slice(idx, tagsIdx);
  if (segment.includes('profitability:')) { console.log(`SKIP (already has profitability): ${orderId}`); continue; }

  content = content.slice(0, tagsIdx) + profBlock + content.slice(tagsIdx);
  count++;
}

writeFileSync(f, content, 'utf8');
console.log(`Patched ${count} orders`);
