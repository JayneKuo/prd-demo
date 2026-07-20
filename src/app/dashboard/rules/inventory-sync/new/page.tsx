'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import InventorySyncRuleForm from '../_components/rule-form';

function NewPageInner() {
  const params = useSearchParams();
  const editId = params.get('edit'); // ?edit=ISR-001 → edit mode
  return <InventorySyncRuleForm editId={editId} />;
}

export default function NewInventorySyncRulePage() {
  return (
    <Suspense>
      <NewPageInner />
    </Suspense>
  );
}
