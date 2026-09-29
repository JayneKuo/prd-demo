import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const f = join(__dirname, '../src/lib/mock-data/order-details-extra.ts');
let content = readFileSync(f, 'utf8');

// Pattern: profitability block stuck inside customer object
// The polluted pattern looks like:
//       totalSpent: '...',
//       profitability: {
//       warehouseCost: ...,
//       ...
//     },
//     additionalFees: [],
//         tags: [],
//       acceptsMarketing: ...
// We need to remove profitability block + additionalFees + fix tags indentation

// Match the pollution: from "      profitability: {" to "    additionalFees: [],\n        tags: [],"
// and replace with just "      tags: [],"
const pollutionPattern = /,\n      profitability: \{[\s\S]*?additionalFees: \[\],\n\s+tags: \[\],/g;

let count = 0;
content = content.replace(pollutionPattern, (match) => {
  count++;
  return ',\n      tags: [],';
});

writeFileSync(f, content, 'utf8');
console.log(`Fixed ${count} customer pollution instances`);
