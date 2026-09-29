import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const f = join(__dirname, '../src/lib/mock-data/order-details-extra.ts');
let content = readFileSync(f, 'utf8');

const map = {
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

  const marker = `id: '${orderId}'`;
  const idx = content.indexOf(marker);
  if (idx === -1) { console.log(`NOT FOUND: ${orderId}`); continue; }

  // Use "    note: " as anchor (4 spaces, order-level note field)
  // Find first "    note: " after the marker
  let searchFrom = idx;
  let noteIdx = -1;
  while (true) {
    const found = content.indexOf('\n    note: ', searchFrom);
    if (found === -1) break;
    noteIdx = found + 1; // skip the \n
    break;
  }
  
  if (noteIdx === -1) { 
    // Fallback: use "    tags: [" at order level
    const tagsIdx = content.indexOf('\n    tags: [', idx);
    if (tagsIdx === -1) { console.log(`NO ANCHOR: ${orderId}`); continue; }
    const segment = content.slice(idx, tagsIdx);
    if (segment.includes('profitability:')) { console.log(`SKIP: ${orderId}`); continue; }
    content = content.slice(0, tagsIdx + 1) + profBlock + content.slice(tagsIdx + 1);
    count++;
    continue;
  }

  const segment = content.slice(idx, noteIdx);
  if (segment.includes('profitability:')) { console.log(`SKIP: ${orderId}`); continue; }
  
  // Insert profBlock before "    note: "
  content = content.slice(0, noteIdx) + profBlock + content.slice(noteIdx);
  count++;
  console.log(`Patched: ${orderId}`);
}

writeFileSync(f, content, 'utf8');
console.log(`\nTotal patched: ${count}`);
