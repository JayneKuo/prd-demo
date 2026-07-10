import { describe, expect, it } from 'vitest';
import { generatePrdMarkdown } from './prd-generator';
import { createNode } from './tree-document';
import type { RequirementPageDocument, RequirementProjectDocument } from './types';

describe('generatePrdMarkdown', () => {
  it('renders schema v2 tree documents in tree order', () => {
    const field = createNode({
      type: 'field',
      title: 'Customer Name',
      content: {
        description: 'Customer name filter.',
        acceptanceCriteria: ['Filtering by customer name narrows results.'],
        openQuestions: []
      }
    });
    const action = createNode({
      type: 'action',
      title: 'Create Order',
      content: {
        description: 'Create a new outbound order.',
        acceptanceCriteria: ['Clicking create opens the order form.'],
        openQuestions: ['Who can create orders?']
      }
    });
    const page = createNode({ type: 'page', title: 'Outbound List', route: '/dashboard/outbound', children: [field, action] });
    const moduleNode = createNode({ type: 'module', title: 'Outbound', children: [page] });
    const document: RequirementProjectDocument = {
      schemaVersion: 2,
      projectName: 'Outbound',
      pageId: 'dashboard-outbound',
      route: '/dashboard/outbound',
      rootNodes: [moduleNode],
      updatedAt: '2026-06-29T00:00:00.000Z'
    };

    const markdown = generatePrdMarkdown(document);

    expect(markdown).toContain('# PRD：Outbound');
    expect(markdown.indexOf('### Customer Name')).toBeLessThan(markdown.indexOf('### Create Order'));
    expect(markdown).toContain('- Filtering by customer name narrows results.');
    expect(markdown).toContain('- Who can create orders?');
  });

  it('migrates flat page documents before generating Markdown', () => {
    const document: RequirementPageDocument = {
      pageId: 'dashboard-outbound',
      route: '/dashboard/outbound',
      title: 'Outbound',
      actors: ['Planner'],
      annotations: [],
      flows: [],
      updatedAt: '2026-06-29T00:00:00.000Z'
    };

    expect(generatePrdMarkdown(document)).toContain('# PRD：Outbound');
  });

  it('renders annotation rule rows as a Markdown table', () => {
    const field = createNode({
      type: 'field',
      title: 'Amount',
      content: {
        rules: [
          {
            id: 'rule-required',
            subject: 'Amount',
            description: 'Amount is required.',
            condition: 'When submitting the form.',
            behavior: 'Show an inline required-field message.',
            notes: 'Confirm final copy later.'
          }
        ]
      }
    });
    const document: RequirementProjectDocument = {
      schemaVersion: 2,
      projectName: 'Outbound',
      pageId: 'dashboard-outbound',
      route: '/dashboard/outbound',
      rootNodes: [field],
      updatedAt: '2026-06-29T00:00:00.000Z'
    };

    const markdown = generatePrdMarkdown(document);

    expect(markdown).toContain('| Subject | Rule | Condition | System Behavior / Hint | Notes |');
    expect(markdown).toContain('| Amount | Amount is required. | When submitting the form. | Show an inline required-field message. | Confirm final copy later. |');
  });
});
