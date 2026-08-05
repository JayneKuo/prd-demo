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

export async function parseSkuImportFile(file: File): Promise<ParsedSkuImport> {
  const extension = getFileExtension(file.name);
  if (!extension) {
    throw new Error('仅支持 Excel 或 CSV 文件');
  }

  // Dynamic import keeps xlsx out of the server-side bundle/trace
  const XLSX = await import('xlsx');

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('文件中没有可读取的工作表');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: ''
  });

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
