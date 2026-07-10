import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getPrdMarkdownFileName, PRD_ANNOTATIONS_DIR, sanitizePageId } from '@/components/requirement-annotator/page-id';
import { generatePrdMarkdown } from '@/components/requirement-annotator/prd-generator';
import { migrateToProjectDocument } from '@/components/requirement-annotator/tree-document';
import type { RequirementDocument } from '@/components/requirement-annotator/types';

export async function POST(request: NextRequest) {
  const document = migrateToProjectDocument((await request.json()) as RequirementDocument);
  const pageId = sanitizePageId(document.pageId);
  const root = path.join(process.cwd(), PRD_ANNOTATIONS_DIR);
  const filePath = path.join(root, getPrdMarkdownFileName(pageId));
  const markdown = generatePrdMarkdown({ ...document, pageId });

  await mkdir(root, { recursive: true });
  await writeFile(filePath, markdown, 'utf8');

  return NextResponse.json({ pageId, markdown, fileName: getPrdMarkdownFileName(pageId) });
}
