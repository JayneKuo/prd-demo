import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getAnnotationJsonFileName, getPageIdFromRoute, PRD_ANNOTATIONS_DIR, PROJECT_ANNOTATIONS_FILE, sanitizePageId } from '@/components/requirement-annotator/page-id';
import { createEmptyProjectDocument, migrateToProjectDocument } from '@/components/requirement-annotator/tree-document';
import type { RequirementDocument, RequirementProjectDocument } from '@/components/requirement-annotator/types';

function getAnnotationPath(pageId: string) {
  const root = path.join(process.cwd(), PRD_ANNOTATIONS_DIR);
  return {
    root,
    filePath: path.join(root, getAnnotationJsonFileName(pageId)),
    projectFilePath: path.join(root, PROJECT_ANNOTATIONS_FILE)
  };
}

export async function GET(request: NextRequest) {
  const route = request.nextUrl.searchParams.get('route') || '/';
  const pageId = getPageIdFromRoute(route);
  const { filePath, projectFilePath } = getAnnotationPath(pageId);

  try {
    const content = await readFile(projectFilePath, 'utf8');
    return NextResponse.json(migrateToProjectDocument(JSON.parse(content) as RequirementDocument));
  } catch {
    try {
      const content = await readFile(filePath, 'utf8');
      return NextResponse.json(migrateToProjectDocument(JSON.parse(content) as RequirementDocument));
    } catch {
      return NextResponse.json(createEmptyProjectDocument(route, new Date().toISOString()));
    }
  }
}

export async function POST(request: NextRequest) {
  const document = migrateToProjectDocument((await request.json()) as RequirementDocument);
  const pageId = sanitizePageId(document.pageId || getPageIdFromRoute(document.route || '/'));
  const { root, projectFilePath } = getAnnotationPath(pageId);
  const payload: RequirementProjectDocument = {
    ...document,
    pageId: document.pageId,
    route: document.route,
    updatedAt: new Date().toISOString()
  };

  await mkdir(root, { recursive: true });
  await writeFile(projectFilePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return NextResponse.json(payload);
}
