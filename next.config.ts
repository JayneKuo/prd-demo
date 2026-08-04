import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack is the default bundler in dev for Next.js 15+
  outputFileTracingExcludes: {
    '/api/prd-annotations/export': [
      // UI components not needed in this server-only route
      './src/components/requirement-annotator/requirement-annotator.tsx',
      './src/components/requirement-annotator/annotation-markers.tsx',
      './src/components/requirement-annotator/element-picker.tsx',
      './src/components/requirement-annotator/node-editor.tsx',
      './src/components/requirement-annotator/page-annotation-list.tsx',
      './src/components/requirement-annotator/prd-preview-panel.tsx',
      './src/components/requirement-annotator/project-structure-tree.tsx',
      './src/components/requirement-annotator/project-tree-nav.tsx',
      './src/components/requirement-annotator/review-card-popover.tsx',
      './src/components/requirement-annotator/flow-builder.tsx',
      // Exclude large packages not used by this route
      './node_modules/xlsx/**',
      './node_modules/sharp/**',
      './node_modules/lucide-react/**',
    ],
  },
};

export default nextConfig;
