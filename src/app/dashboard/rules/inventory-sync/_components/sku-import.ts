export type ParsedSkuImport = {
  values: string[];
  sourceColumn: string;
  warnings: string[];
};

const SUPPORTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const PREFERRED_HEADERS = ['sku', 'sku code', 'skucode', 'merchantsku', 'merchant sku', 'sku编码', 'sku code/编码'];

function getFileExtension(name: string) {
  const lower = name.toLowerCase();
  return SUPPORTED_EXTENSIONS.find((ext) => lower.endsWith(ext)) ?? '';
}

function normalizeValues(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
    )
  );
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields and common delimiters)
// ---------------------------------------------------------------------------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  // Normalize line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let inQuote = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if ((ch === ',' || ch === '\t') && !inQuote) {
        cols.push(cell);
        cell = '';
      } else {
        cell += ch;
      }
    }
    cols.push(cell);
    rows.push(cols);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// XLSX parser — reads the first sheet from an Office Open XML (.xlsx) file.
// .xlsx is a ZIP archive; we extract xl/worksheets/sheet1.xml and
// xl/sharedStrings.xml using the browser's native DecompressionStream API.
// ---------------------------------------------------------------------------
async function unzipEntry(zipBytes: Uint8Array, entryName: string): Promise<string | null> {
  // Locate the local file header for the given entry name
  const nameBytes = new TextEncoder().encode(entryName);
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);

  let offset = 0;
  while (offset + 30 < zipBytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break; // local file header signature

    const flags = view.getUint16(offset + 6, true);
    const compression = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const dataOffset = offset + 30 + nameLen + extraLen;

    const entryNameSlice = zipBytes.slice(offset + 30, offset + 30 + nameLen);
    const currentName = new TextDecoder().decode(entryNameSlice);

    if (currentName === entryName) {
      const compressedData = zipBytes.slice(dataOffset, dataOffset + compressedSize);
      if (compression === 0) {
        // Stored (no compression)
        return new TextDecoder().decode(compressedData);
      } else if (compression === 8) {
        // Deflate — use DecompressionStream (available in modern browsers and Node 18+)
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressedData);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks: Uint8Array[] = [];
        let totalLen = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          totalLen += value.length;
        }
        const out = new Uint8Array(totalLen);
        let pos = 0;
        for (const chunk of chunks) { out.set(chunk, pos); pos += chunk.length; }
        return new TextDecoder().decode(out);
      }
    }

    // Skip to next entry (handle data descriptor flag)
    const hasDataDescriptor = (flags & 0x08) !== 0;
    const skipSize = hasDataDescriptor && compressedSize === 0
      ? 0 // can't determine size; fall back below
      : compressedSize;
    offset = dataOffset + skipSize;
  }
  return null;
}

function xmlAttr(tag: string, attr: string): string {
  const m = new RegExp(`${attr}="([^"]*)"`, 'i').exec(tag);
  return m ? m[1] : '';
}

async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(buffer);

  // Extract shared strings (optional — some xlsx files omit this)
  const sharedStringsXml = await unzipEntry(bytes, 'xl/sharedStrings.xml');
  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const siMatches = sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g);
    for (const si of siMatches) {
      // Collect all <t> text nodes within the <si>
      const tMatches = si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g);
      let str = '';
      for (const t of tMatches) str += t[1];
      // Unescape basic XML entities
      sharedStrings.push(str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
    }
  }

  // Extract first worksheet
  const sheetXml = await unzipEntry(bytes, 'xl/worksheets/sheet1.xml');
  if (!sheetXml) throw new Error('无法读取工作表内容');

  // Parse rows and cells
  const rows: Map<string, string[][]> = new Map();
  const rowMatches = sheetXml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g);
  const rowData: { r: number; cells: { col: number; value: string }[] }[] = [];

  for (const rowMatch of rowMatches) {
    const rowNum = parseInt(rowMatch[1], 10);
    const cells: { col: number; value: string }[] = [];
    const cellMatches = rowMatch[2].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g);
    for (const cell of cellMatches) {
      const cellAttrStr = cell[1];
      const cellRef = xmlAttr(cellAttrStr + '"', 'r') || (cellAttrStr.match(/r="([A-Z]+\d+)"/) ?? ['', ''])[1];
      const colStr = (cellRef.match(/^([A-Z]+)/) ?? ['', 'A'])[1];
      // Convert column letters to 0-based index
      let col = 0;
      for (const ch of colStr) col = col * 26 + (ch.charCodeAt(0) - 64);
      col -= 1;

      const type = xmlAttr(cellAttrStr + '"', 't');
      const vMatch = cell[2].match(/<v>([\s\S]*?)<\/v>/);
      const raw = vMatch ? vMatch[1] : '';

      let value = '';
      if (type === 's') {
        // Shared string index
        value = sharedStrings[parseInt(raw, 10)] ?? '';
      } else if (type === 'inlineStr') {
        const tMatch = cell[2].match(/<t>([\s\S]*?)<\/t>/);
        value = tMatch ? tMatch[1] : '';
      } else {
        value = raw;
      }
      cells.push({ col, value });
    }
    rowData.push({ r: rowNum, cells });
  }

  // Convert to 2D array
  rowData.sort((a, b) => a.r - b.r);
  const result: string[][] = [];
  for (const row of rowData) {
    const arr: string[] = [];
    for (const cell of row.cells) {
      while (arr.length <= cell.col) arr.push('');
      arr[cell.col] = cell.value;
    }
    result.push(arr);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function parseSkuImportFile(file: File): Promise<ParsedSkuImport> {
  const extension = getFileExtension(file.name);
  if (!extension) {
    throw new Error('仅支持 Excel 或 CSV 文件');
  }

  let rows: string[][];

  if (extension === '.csv') {
    const text = await file.text();
    rows = parseCsv(text);
  } else {
    // .xlsx / .xls — only .xlsx (Office Open XML) is supported natively
    if (extension === '.xls') {
      throw new Error('暂不支持旧版 .xls 格式，请将文件另存为 .xlsx 或 .csv 后重新导入');
    }
    const buffer = await file.arrayBuffer();
    rows = await parseXlsx(buffer);
  }

  if (rows.length === 0) {
    throw new Error('文件内容为空');
  }

  const [firstRow, ...restRows] = rows;
  const normalizedHeaders = firstRow.map(normalizeHeader);
  const preferredIndex = normalizedHeaders.findIndex((header) => PREFERRED_HEADERS.includes(header));
  const hasRecognizedHeader = preferredIndex >= 0;
  const columnIndex = hasRecognizedHeader ? preferredIndex : 0;
  const dataRows = hasRecognizedHeader ? restRows : rows;

  const values = normalizeValues(dataRows.map((row) => row?.[columnIndex]));
  if (values.length === 0) {
    throw new Error('文件中没有可导入的 SKU 值');
  }

  return {
    values,
    sourceColumn: hasRecognizedHeader ? String(firstRow[columnIndex] ?? 'sku') : '第一列',
    warnings: hasRecognizedHeader ? [] : ['未识别到 sku 列，已按第一列导入']
  };
}
