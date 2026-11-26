import { WarehouseCenter } from '@/components/warehouses/warehouse-center';

export default function WarehousesPage() {
  return <div className="mx-auto max-w-[1200px] pt-5 text-[var(--foreground)] lg:pt-6">
    <header className="mb-5">
      <h1 className="text-[22px] font-semibold tracking-tight">仓库中心</h1>
      <p className="mt-1 text-[13px] text-[var(--muted)]">统一管理本地仓、虚拟仓和第三方平台仓，关联已连接 APP 提供的仓库资源。</p>
    </header>
    <WarehouseCenter />
  </div>;
}
