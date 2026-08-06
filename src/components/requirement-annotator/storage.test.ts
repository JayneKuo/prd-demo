import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProjectDocument } from './tree-document';
import { downloadRequirementPrd, loadRequirementDocument, saveRequirementDocument } from './storage';

const storage = new Map<string, string>();

function installBrowser() {
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      clear: () => storage.clear(),
    },
  });
}

afterEach(() => {
  storage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PRD annotation browser storage', () => {
  it('creates an empty project document when no document is stored', async () => {
    installBrowser();

    await expect(loadRequirementDocument('/dashboard/outbound')).resolves.toMatchObject({
      schemaVersion: 2,
      pageId: 'dashboard-outbound',
      route: '/dashboard/outbound',
      rootNodes: [],
    });
  });

  it('round-trips a shared project document through localStorage', async () => {
    installBrowser();
    const document = createEmptyProjectDocument('/dashboard/outbound', '2026-06-29T00:00:00.000Z');
    document.projectName = 'Outbound';

    await saveRequirementDocument(document);

    await expect(loadRequirementDocument('/dashboard/orders')).resolves.toMatchObject({
      schemaVersion: 2,
      projectName: 'Outbound',
      route: '/dashboard/orders',
      pageId: 'dashboard-orders',
    });
  });

  it('recovers from malformed stored data', async () => {
    installBrowser();
    storage.set('requirement-annotator:project-document:v2', '{not valid json');

    await expect(loadRequirementDocument('/dashboard/orders')).resolves.toMatchObject({
      schemaVersion: 2,
      route: '/dashboard/orders',
      rootNodes: [],
    });
  });

  it('downloads Markdown with a sanitized filename and cleans up the URL', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const anchor = { href: '', download: '', click, remove };
    const browserDocument = {
      body: { appendChild },
      createElement: vi.fn(() => anchor),
    };
    vi.stubGlobal('window', { document: browserDocument });
    vi.stubGlobal('document', browserDocument);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:prd'),
      revokeObjectURL: vi.fn(),
    });

    const document = createEmptyProjectDocument('/dashboard/outbound', '2026-06-29T00:00:00.000Z');
    document.pageId = '../Outbound PRD';
    const fileName = downloadRequirementPrd(document);

    expect(fileName).toBe('outbound-prd.prd.md');
    expect(anchor.download).toBe('outbound-prd.prd.md');
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:prd');
  });
});
