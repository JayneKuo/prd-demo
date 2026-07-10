'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, X, Check, ExternalLink, Layers, Warehouse, Link2, ArrowDownToLine, ArrowUpFromLine, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { cn } from '@/lib/utils';
import {
  systemCarriers,
  carrierMappings,
  carrierAuths,
  serviceProducts,
  connectedSystems,
  carrierWarehouseBindings,
  platformShippingBinds,
  type SystemCarrier,
  type CarrierAuth,
  type ServiceProduct,
  type CarrierMapping,
  type CarrierWarehouseBinding,
} from '@/lib/mock-data/carriers';

// 右侧 Tab
type RightTab = 'info' | 'channel-in' | 'warehouse-out' | 'callback';

export default function CarriersPage() {
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>('SC-002');
  const [activeTab, setActiveTab] = useState<RightTab>('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCarrier, setShowNewCarrier] = useState(false);

  const selectedCarrier = systemCarriers.find((c) => c.id === selectedCarrierId);

  // 左侧只展示已授权的承运商
  const authorizedCarriers = useMemo(() => {
    const authIds = new Set(carrierAuths.filter((a) => a.status === '已授权').map((a) => a.carrierId));
    let list = systemCarriers.filter((c) => authIds.has(c.id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    }
    return list;
  }, [searchQuery]);

  // 选中承运商的关联数据
  const auth = carrierAuths.find((a) => a.carrierId === selectedCarrierId);
  const services = serviceProducts.filter((s) => s.carrierId === selectedCarrierId);
  const channelMappings = carrierMappings.filter((m) => m.systemCarrierId === selectedCarrierId);
  const warehouseBindings = carrierWarehouseBindings.filter((b) => b.carrierId === selectedCarrierId);

  const tabs: { key: RightTab; label: string; icon: typeof Link2; count?: number }[] = [
    { key: 'info', label: '基本信息', icon: Layers },
    { key: 'channel-in', label: '渠道映射（入）', icon: ArrowDownToLine, count: channelMappings.length },
    { key: 'warehouse-out', label: '仓库映射（出）', icon: ArrowUpFromLine, count: warehouseBindings.length },
    { key: 'callback', label: '回传配置（回）', icon: RotateCcw },
  ];

  return (
    <div className="mx-auto max-w-[1400px] pt-5 lg:pt-6">
      <PageHeader
        title="承运商管理"
        description="管理已授权承运商的渠道映射、仓库映射和回传配置。"
        actions={[]}
      />

      {/* 流程示意 */}
      <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
        <div className="flex items-center justify-center gap-2 text-[12px]">
          <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-700">渠道订单</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-700">渠道映射（入）</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">系统承运商</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-700">仓库映射（出）</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-700">仓库发货</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="rounded bg-rose-100 px-2 py-0.5 font-medium text-rose-700">回传配置（回）</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-700">渠道平台</span>
        </div>
      </div>

      {/* 主体：左右分栏 */}
      <div className="flex gap-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden" style={{ minHeight: 580 }}>
        {/* ═══ 左侧：已授权承运商列表 ═══ */}
        <div className="w-[220px] shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--surface-subtle)]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-subtle)]">
            <span className="text-[12px] font-semibold text-[var(--foreground)]">已授权承运商</span>
            <button onClick={() => setShowNewCarrier(true)} className="rounded p-1 text-[var(--primary)] hover:bg-[var(--primary-soft)]" title="新增承运商">
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="px-2.5 py-2 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索..."
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] pl-7 pr-2 text-[11px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {authorizedCarriers.map((carrier) => {
              const isSelected = selectedCarrierId === carrier.id;
              return (
                <button
                  key={carrier.id}
                  onClick={() => { setSelectedCarrierId(carrier.id); setActiveTab('info'); }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all',
                    isSelected
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'hover:bg-[var(--surface)] text-[var(--foreground)]'
                  )}
                >
                  <div className={cn('size-2 rounded-full shrink-0', isSelected ? 'bg-green-300' : 'bg-green-500')} />
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-[12px] font-medium truncate')}>{carrier.name}</div>
                    <div className={cn('text-[10px]', isSelected ? 'text-white/70' : 'text-[var(--muted)]')}>{carrier.code} · {carrier.region}</div>
                  </div>
                </button>
              );
            })}
            {authorizedCarriers.length === 0 && (
              <p className="px-3 py-4 text-[11px] text-[var(--muted)] text-center">暂无已授权承运商</p>
            )}
          </div>
        </div>

        {/* ═══ 右侧：Tab 内容 ═══ */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedCarrier ? (
            <>
              {/* Tab 导航 */}
              <div className="flex items-center border-b border-[var(--border)] px-5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'flex items-center gap-1.5 border-b-2 px-4 py-3 text-[12px] font-medium transition-colors',
                        isActive
                          ? 'border-[var(--primary)] text-[var(--primary)]'
                          : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                      )}
                    >
                      <Icon className="size-3.5" />
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={cn('ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold', isActive ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'bg-[var(--surface-subtle)] text-[var(--muted)]')}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 内容区 */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'info' && <TabInfo carrier={selectedCarrier} auth={auth} services={services} />}
                {activeTab === 'channel-in' && <TabChannelIn carrier={selectedCarrier} mappings={channelMappings} />}
                {activeTab === 'warehouse-out' && <TabWarehouseOut carrier={selectedCarrier} bindings={warehouseBindings} services={services} />}
                {activeTab === 'callback' && <TabCallback carrier={selectedCarrier} />}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[13px] text-[var(--muted)]">请从左侧选择一个承运商</div>
          )}
        </div>
      </div>

      {showNewCarrier && <NewCarrierModal onClose={() => setShowNewCarrier(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Tab 1: 基本信息（承运商 + 授权 + 服务方式）— 可编辑
// ═══════════════════════════════════════════════
function TabInfo({ carrier, auth, services }: { carrier: SystemCarrier; auth?: CarrierAuth; services: ServiceProduct[] }) {
  const [editingBasic, setEditingBasic] = useState(false);
  const [editingAuth, setEditingAuth] = useState(false);
  const [showAddService, setShowAddService] = useState(false);

  // 基本信息编辑态
  const [editName, setEditName] = useState(carrier.name);
  const [editCode, setEditCode] = useState(carrier.code);
  const [editType, setEditType] = useState(carrier.type);
  const [editRegion, setEditRegion] = useState(carrier.region);
  const [editContact, setEditContact] = useState(carrier.contact);
  const [editPhone, setEditPhone] = useState(carrier.phone);
  const [editWebsite, setEditWebsite] = useState(carrier.website || '');

  // 授权信息编辑态
  const [editApiAddress, setEditApiAddress] = useState(auth?.apiAddress || '');
  const [editUsername, setEditUsername] = useState(auth?.username || '');
  const [editAccessKey, setEditAccessKey] = useState(auth?.accessKey || '');
  const [editAccountNumber, setEditAccountNumber] = useState(auth?.accountNumber || '');
  const [editPassword, setEditPassword] = useState('');

  // 新增服务方式
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcCode, setNewSvcCode] = useState('');
  const [newSvcMethod, setNewSvcMethod] = useState('Express');
  const [newSvcPromise, setNewSvcPromise] = useState('');

  const handleSaveBasic = () => {
    alert(`承运商信息已更新:\n名称: ${editName}\n编码: ${editCode}\n类型: ${editType}\n区域: ${editRegion}`);
    setEditingBasic(false);
  };

  const handleSaveAuth = () => {
    alert(`授权信息已更新:\nAPI: ${editApiAddress}\nUser: ${editUsername}\nAccount: ${editAccountNumber}`);
    setEditingAuth(false);
  };

  const handleAddService = () => {
    if (!newSvcName || !newSvcCode) return;
    alert(`服务方式已添加:\n名称: ${newSvcName}\n代码: ${newSvcCode}\n运输方式: ${newSvcMethod}\n时效: ${newSvcPromise}`);
    setShowAddService(false);
    setNewSvcName(''); setNewSvcCode(''); setNewSvcMethod('Express'); setNewSvcPromise('');
  };

  return (
    <div className="p-6 flex gap-6">
      {/* 左栏 */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* 承运商基本信息 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-[var(--foreground)]">承运商信息</h3>
            {!editingBasic ? (
              <button onClick={() => setEditingBasic(true)} className="text-[11px] text-[var(--primary)] font-medium hover:underline">编辑</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSaveBasic} className="h-6 rounded bg-[var(--primary)] px-2.5 text-[10px] font-semibold text-white">保存</button>
                <button onClick={() => setEditingBasic(false)} className="h-6 rounded border border-[var(--border)] px-2.5 text-[10px]">取消</button>
              </div>
            )}
          </div>
          {editingBasic ? (
            <div className="grid grid-cols-2 gap-3 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-4">
              <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">名称 *</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">编码 *</label><input type="text" value={editCode} onChange={(e) => setEditCode(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">类型</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)} className={inputClass}><option>快递</option><option>专线</option><option>海运</option><option>空运</option><option>平台</option></select>
              </div>
              <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">区域</label><input type="text" value={editRegion} onChange={(e) => setEditRegion(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">联系人</label><input type="text" value={editContact} onChange={(e) => setEditContact(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">电话</label><input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputClass} /></div>
              <div className="col-span-2"><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">官网</label><input type="text" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} className={inputClass} placeholder="https://" /></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[12px] rounded-xl border border-[var(--border)] p-4">
              <InfoRow label="名称" value={carrier.name} />
              <InfoRow label="编码" value={carrier.code} mono />
              <InfoRow label="类型" value={carrier.type} />
              <InfoRow label="区域" value={carrier.region} />
              <InfoRow label="联系人" value={carrier.contact} />
              <InfoRow label="电话" value={carrier.phone} />
              <InfoRow label="状态" value={carrier.status} badge />
              <InfoRow label="创建时间" value={carrier.createdAt} />
            </div>
          )}
        </section>

        {/* 授权状态 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-[var(--foreground)]">授权配置</h3>
            {!editingAuth ? (
              <button onClick={() => setEditingAuth(true)} className="text-[11px] text-[var(--primary)] font-medium hover:underline">
                {auth ? '重新授权' : '配置授权'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSaveAuth} className="h-6 rounded bg-[var(--primary)] px-2.5 text-[10px] font-semibold text-white">保存</button>
                <button onClick={() => setEditingAuth(false)} className="h-6 rounded border border-[var(--border)] px-2.5 text-[10px]">取消</button>
              </div>
            )}
          </div>
          {editingAuth ? (
            <div className="rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">* API Address</label>
                <input type="text" value={editApiAddress} onChange={(e) => setEditApiAddress(e.target.value)} placeholder="https://api.example.com/webservices/Ship" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">* User Name</label><input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="填入 User Name" className={inputClass} /></div>
                <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">* Password</label><input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="填入 Password" className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">* Access Key</label><input type="text" value={editAccessKey} onChange={(e) => setEditAccessKey(e.target.value)} placeholder="填入 Access Key" className={inputClass} /></div>
                <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">Account Number</label><input type="text" value={editAccountNumber} onChange={(e) => setEditAccountNumber(e.target.value)} placeholder="填入 Account Number" className={inputClass} /></div>
              </div>
              <button className="h-7 rounded-lg border border-[var(--border)] px-3 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">测试连接</button>
            </div>
          ) : auth ? (
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-2.5 text-[12px]">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={auth.status} />
                {auth.status === '已授权' && <span className="text-green-600 text-[11px]">授权于 {auth.authorizedAt}</span>}
                {auth.status === '已过期' && <span className="text-red-500 text-[11px]">过期于 {auth.expiresAt}</span>}
              </div>
              <InfoRow label="授权方式" value={auth.authType.toUpperCase()} mono />
              <InfoRow label="API地址" value={auth.apiAddress || '—'} mono />
              <InfoRow label="User" value={auth.username || '—'} />
              <InfoRow label="Account" value={auth.accountNumber || '—'} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-[12px] text-[var(--muted)]">
              暂无授权信息，点击右上角「配置授权」开始
            </div>
          )}
        </section>

        {/* 服务方式 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-[var(--foreground)]">服务方式 ({services.length})</h3>
            <button onClick={() => setShowAddService(true)} className="text-[11px] text-[var(--primary)] font-medium hover:underline">
              <Plus className="inline size-3 mr-0.5" />新增服务
            </button>
          </div>

          {showAddService && (
            <div className="mb-3 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-4 space-y-3">
              <p className="text-[12px] font-semibold text-[var(--foreground)]">新增服务方式</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">服务名称 *</label><input type="text" value={newSvcName} onChange={(e) => setNewSvcName(e.target.value)} placeholder="如 UPS Ground" className={inputClass} /></div>
                <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">服务代码 *</label><input type="text" value={newSvcCode} onChange={(e) => setNewSvcCode(e.target.value)} placeholder="如 03" className={inputClass} /></div>
                <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">运输方式</label>
                  <select value={newSvcMethod} onChange={(e) => setNewSvcMethod(e.target.value)} className={inputClass}><option>Express</option><option>Parcel</option><option>LTL</option><option>FTL</option><option>Ocean</option><option>Air</option></select>
                </div>
                <div><label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">时效承诺</label><input type="text" value={newSvcPromise} onChange={(e) => setNewSvcPromise(e.target.value)} placeholder="如 1-3工作日" className={inputClass} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddService} className="h-7 rounded bg-[var(--primary)] px-3 text-[11px] font-semibold text-white">确认</button>
                <button onClick={() => setShowAddService(false)} className="h-7 rounded border border-[var(--border)] px-3 text-[11px]">取消</button>
              </div>
            </div>
          )}

          {services.length > 0 ? (
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="min-w-full text-[12px]">
                <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-2 text-left">服务名称</th>
                    <th className="px-4 py-2 text-left">代码</th>
                    <th className="px-4 py-2 text-left">运输方式</th>
                    <th className="px-4 py-2 text-left">时效</th>
                    <th className="px-4 py-2 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--surface-subtle)]">
                      <td className="px-4 py-2 font-medium text-[var(--foreground)]">{s.name}</td>
                      <td className="px-4 py-2 font-mono text-[var(--muted)]">{s.serviceCode || s.code}</td>
                      <td className="px-4 py-2 text-[var(--muted)]">{s.shipMethod}</td>
                      <td className="px-4 py-2 text-[var(--muted)]">{s.deliveryPromise}</td>
                      <td className="px-4 py-2">
                        <button className="text-[11px] text-[var(--primary)] hover:underline mr-2">编辑</button>
                        <button className="text-[11px] text-red-500 hover:underline">停用</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-[12px] text-[var(--muted)]">暂无服务方式</div>
          )}
        </section>
      </div>

      {/* 右栏：授权操作指引 */}
      <div className="w-[300px] shrink-0">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sticky top-6">
          <h4 className="text-[13px] font-semibold text-[var(--foreground)] mb-3">授权操作指引</h4>
          <div className="space-y-3 text-[11px] text-[var(--foreground)]">
            <div className="space-y-1.5">
              <p className="font-medium">第一步：登录{carrier.name}官方网站</p>
              {carrier.website && (
                <a href={carrier.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline">
                  <ExternalLink className="size-3" />{carrier.website}
                </a>
              )}
            </div>
            <div className="space-y-1.5">
              <p className="font-medium">第二步：进入开发者中心</p>
              <p className="text-[var(--muted)]">获取 API 授权凭证（Access Key / Token）。</p>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium">第三步：创建支付账号</p>
              <p className="text-[var(--muted)]">进入支付设置创建支付账号用于运费结算。</p>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium">第四步：填写授权信息</p>
              <p className="text-[var(--muted)]">在左侧点击「重新授权」填入凭证完成对接。</p>
            </div>
          </div>
          {auth?.status === '已过期' && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-600">
              <p className="font-medium">⚠️ 授权已过期</p>
              <p>请点击「重新授权」更新凭证。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Tab 2: 渠道映射（入）
// 完整映射：承运商 + SCAC + 运输方式 + 运输服务 + 渠道 + 仓库
// ═══════════════════════════════════════════════
function TabChannelIn({ carrier, mappings }: { carrier: SystemCarrier; mappings: CarrierMapping[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    externalName: '', scac: '', shipMethod: '', serviceCode: '', channel: '', warehouse: '', remark: ''
  });

  const handleAdd = () => {
    if (!formData.externalName || !formData.channel) return;
    alert(`渠道映射已添加:\n承运商: ${formData.externalName}\nSCAC: ${formData.scac}\n运输方式: ${formData.shipMethod}\n运输服务: ${formData.serviceCode}\n渠道: ${formData.channel}\n仓库: ${formData.warehouse}`);
    setShowAdd(false);
    setFormData({ externalName: '', scac: '', shipMethod: '', serviceCode: '', channel: '', warehouse: '', remark: '' });
  };

  const services = serviceProducts.filter((s) => s.carrierId === carrier.id);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">渠道映射（入）</h3>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">
            渠道订单的承运商信息映射到系统承运商 <strong>{carrier.name}</strong>，包含 SCAC、运输方式、运输服务、渠道和仓库
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white hover:opacity-90">
          <Plus className="inline size-3.5 mr-1" />添加映射
        </button>
      </div>

      {/* 添加表单 */}
      {showAdd && (
        <div className="mb-4 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-4 space-y-3">
          <p className="text-[12px] font-semibold text-[var(--foreground)]">添加渠道映射</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">渠道承运商名称 *</label>
              <input type="text" value={formData.externalName} onChange={(e) => setFormData({ ...formData, externalName: e.target.value })} placeholder='如 "UPS Ground"' className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">SCAC 代码</label>
              <input type="text" value={formData.scac} onChange={(e) => setFormData({ ...formData, scac: e.target.value })} placeholder="如 UPSN" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">运输方式</label>
              <select value={formData.shipMethod} onChange={(e) => setFormData({ ...formData, shipMethod: e.target.value })} className={inputClass}>
                <option value="">选择</option>
                <option value="Express">Express 快递</option>
                <option value="Parcel">Parcel 包裹</option>
                <option value="LTL">LTL 零担</option>
                <option value="FTL">FTL 整车</option>
                <option value="Ocean">Ocean 海运</option>
                <option value="Air">Air 空运</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">运输服务</label>
              <select value={formData.serviceCode} onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value })} className={inputClass}>
                <option value="">选择服务</option>
                {services.map((s) => <option key={s.id} value={s.code}>{s.name} ({s.serviceCode || s.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">渠道平台 *</label>
              <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value })} className={inputClass}>
                <option value="">选择渠道</option>
                {connectedSystems.filter((s) => s.direction === 'upstream').map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">下发仓库</label>
              <select value={formData.warehouse} onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })} className={inputClass}>
                <option value="">选择仓库</option>
                {connectedSystems.filter((s) => s.direction === 'downstream').map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">备注</label>
            <input type="text" value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} placeholder="可选备注" className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="h-7 rounded bg-[var(--primary)] px-3 text-[11px] font-semibold text-white">确认</button>
            <button onClick={() => setShowAdd(false)} className="h-7 rounded border border-[var(--border)] px-3 text-[11px]">取消</button>
          </div>
        </div>
      )}

      {/* 已有映射表格 — 完整字段 */}
      {mappings.length > 0 ? (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-2 text-left">渠道承运商</th>
                  <th className="px-3 py-2 text-left">SCAC</th>
                  <th className="px-3 py-2 text-left">运输方式</th>
                  <th className="px-3 py-2 text-left">运输服务</th>
                  <th className="px-3 py-2 text-left">渠道</th>
                  <th className="px-3 py-2 text-left">仓库</th>
                  <th className="px-3 py-2 text-left">状态</th>
                  <th className="px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--surface-subtle)]">
                    <td className="px-3 py-2.5 font-medium text-[var(--foreground)]">{m.externalName}</td>
                    <td className="px-3 py-2.5 font-mono text-[var(--muted)]">{m.mappedCode || m.externalCode}</td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">{m.systemServiceName ? 'Express' : '—'}</td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">{m.systemServiceName || '—'}</td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">{m.sourceSystem}</td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">
                      {carrierWarehouseBindings.find((b) => b.carrierId === carrier.id && b.serviceId === m.systemServiceId)?.warehouseName || '—'}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={m.mappingStatus} /></td>
                    <td className="px-3 py-2.5">
                      <button className="text-[11px] text-[var(--primary)] hover:underline mr-2">编辑</button>
                      <button className="text-[11px] text-red-500 hover:underline">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
          <ArrowDownToLine className="size-8 text-[var(--muted)] mx-auto mb-2" />
          <p className="text-[12px] text-[var(--muted)]">暂无渠道映射。添加后，渠道订单上的承运商信息会自动匹配到 {carrier.name}。</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Tab 3: 仓库映射（出）
// 系统承运商 + SCAC + 运输方式 + 运输服务 → 下发仓库 + 渠道
// ═══════════════════════════════════════════════
function TabWarehouseOut({ carrier, bindings, services }: { carrier: SystemCarrier; bindings: CarrierWarehouseBinding[]; services: ServiceProduct[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    scac: '', shipMethod: '', serviceId: '', warehouse: '', channel: '', platformCode: ''
  });

  const handleAdd = () => {
    if (!formData.serviceId || !formData.warehouse) return;
    const svc = services.find((s) => s.id === formData.serviceId);
    alert(`仓库映射已添加:\n承运商: ${carrier.name}\nSCAC: ${formData.scac}\n运输方式: ${formData.shipMethod}\n运输服务: ${svc?.name || formData.serviceId}\n仓库: ${formData.warehouse}\n渠道: ${formData.channel}\n平台仓库代码: ${formData.platformCode}`);
    setShowAdd(false);
    setFormData({ scac: '', shipMethod: '', serviceId: '', warehouse: '', channel: '', platformCode: '' });
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">仓库映射（出）</h3>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">
            配置 <strong>{carrier.name}</strong> 各运输服务按渠道下发到指定仓库
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white hover:opacity-90">
          <Plus className="inline size-3.5 mr-1" />添加映射
        </button>
      </div>

      {/* 添加表单 */}
      {showAdd && (
        <div className="mb-4 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-4 space-y-3">
          <p className="text-[12px] font-semibold text-[var(--foreground)]">添加仓库映射</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">SCAC 代码</label>
              <input type="text" value={formData.scac} onChange={(e) => setFormData({ ...formData, scac: e.target.value })} placeholder="如 UPSN" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">运输方式</label>
              <select value={formData.shipMethod} onChange={(e) => setFormData({ ...formData, shipMethod: e.target.value })} className={inputClass}>
                <option value="">选择</option>
                <option value="Express">Express 快递</option>
                <option value="Parcel">Parcel 包裹</option>
                <option value="LTL">LTL 零担</option>
                <option value="FTL">FTL 整车</option>
                <option value="Ocean">Ocean 海运</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">运输服务 *</label>
              <select value={formData.serviceId} onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })} className={inputClass}>
                <option value="">选择服务</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">渠道</label>
              <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value })} className={inputClass}>
                <option value="">全部渠道</option>
                {connectedSystems.filter((s) => s.direction === 'upstream').map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">下发仓库 *</label>
              <select value={formData.warehouse} onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })} className={inputClass}>
                <option value="">选择仓库</option>
                {connectedSystems.filter((s) => s.direction === 'downstream').map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--foreground)] mb-1">平台仓库代码</label>
              <input type="text" value={formData.platformCode} onChange={(e) => setFormData({ ...formData, platformCode: e.target.value })} placeholder="如 YZ" className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="h-7 rounded bg-[var(--primary)] px-3 text-[11px] font-semibold text-white">确认</button>
            <button onClick={() => setShowAdd(false)} className="h-7 rounded border border-[var(--border)] px-3 text-[11px]">取消</button>
          </div>
        </div>
      )}

      {/* 已有绑定表格 — 完整字段 */}
      {bindings.length > 0 ? (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-2 text-left">承运商</th>
                  <th className="px-3 py-2 text-left">SCAC</th>
                  <th className="px-3 py-2 text-left">运输方式</th>
                  <th className="px-3 py-2 text-left">运输服务</th>
                  <th className="px-3 py-2 text-left">渠道</th>
                  <th className="px-3 py-2 text-left">仓库</th>
                  <th className="px-3 py-2 text-left">状态</th>
                  <th className="px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {bindings.map((b) => {
                  const svc = services.find((s) => s.id === b.serviceId);
                  return (
                    <tr key={b.id} className="hover:bg-[var(--surface-subtle)]">
                      <td className="px-3 py-2.5 font-medium text-[var(--foreground)]">{carrier.name}</td>
                      <td className="px-3 py-2.5 font-mono text-[var(--muted)]">{carrier.code}</td>
                      <td className="px-3 py-2.5 text-[var(--muted)]">{svc?.shipMethod || '—'}</td>
                      <td className="px-3 py-2.5 text-[var(--muted)]">{b.serviceName}</td>
                      <td className="px-3 py-2.5 text-[var(--muted)]">全部</td>
                      <td className="px-3 py-2.5 text-[var(--foreground)]">
                        <div className="flex items-center gap-1.5">
                          <Warehouse className="size-3 text-[var(--muted)]" />
                          {b.warehouseName}
                          {b.platformWarehouseCode && <span className="text-[10px] text-[var(--muted)]">({b.platformWarehouseCode})</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={b.status} /></td>
                      <td className="px-3 py-2.5">
                        <button className="text-[11px] text-[var(--primary)] hover:underline mr-2">编辑</button>
                        <button className="text-[11px] text-red-500 hover:underline">删除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
          <Warehouse className="size-8 text-[var(--muted)] mx-auto mb-2" />
          <p className="text-[12px] text-[var(--muted)]">暂无仓库映射。添加后，系统将按映射关系下发订单到指定仓库。</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Tab 4: 回传配置（回）
// 仓库发货后 → 跟踪号以什么格式回传给渠道平台
// ═══════════════════════════════════════════════
function TabCallback({ carrier }: { carrier: SystemCarrier }) {
  const binds = platformShippingBinds.filter((b) => b.carrierId === carrier.id);
  const [showAdd, setShowAdd] = useState(false);
  const [platform, setPlatform] = useState('');
  const [shipMethod, setShipMethod] = useState('');
  const [deliveryService, setDeliveryService] = useState('');
  const [overrideTracking, setOverrideTracking] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState('');

  const handleAdd = () => {
    if (!platform) return;
    alert(`回传配置已添加:\n承运商: ${carrier.name}\n平台: ${platform}\n发货方式: ${shipMethod}\n配送服务: ${deliveryService}\n覆盖跟踪号: ${overrideTracking ? '是' : '否'}`);
    setShowAdd(false);
    setPlatform('');
    setShipMethod('');
    setDeliveryService('');
    setOverrideTracking(false);
    setTrackingUrl('');
  };

  return (
    <div className="p-6 max-w-[850px]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">回传配置（回）</h3>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">
            仓库使用 <strong>{carrier.name}</strong> 发货后，跟踪号和承运商信息按什么格式回传给各渠道平台
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white hover:opacity-90">
          <Plus className="inline size-3.5 mr-1" />添加
        </button>
      </div>

      {/* 说明卡片 */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-700 space-y-1">
        <p className="font-medium">回传流程说明</p>
        <p>仓库发货获得跟踪号 → 系统根据此配置将单号回传到对应渠道平台 → 平台标记为已发货</p>
        <p>每个平台可能要求不同的发货方式标识和配送服务代码，需分别配置。</p>
      </div>

      {/* 添加表单 */}
      {showAdd && (
        <div className="mb-4 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-4 space-y-3">
          <p className="text-[12px] font-semibold text-[var(--foreground)]">添加回传配置</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">目标平台 *</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputClass}>
                <option value="">选择平台</option>
                {connectedSystems.filter((s) => s.direction === 'upstream').map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">平台发货方式</label>
              <input type="text" value={shipMethod} onChange={(e) => setShipMethod(e.target.value)} placeholder='如 "自营物流" / "平台物流"' className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">平台配送服务代码</label>
              <input type="text" value={deliveryService} onChange={(e) => setDeliveryService(e.target.value)} placeholder="如 UPS_GND" className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">自定义跟踪链接</label>
              <input type="text" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://track.example.com/{tracking_number}" className={inputClass} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-[var(--foreground)]">
            <input type="checkbox" checked={overrideTracking} onChange={(e) => setOverrideTracking(e.target.checked)} className="rounded" />
            覆盖平台已有跟踪号
          </label>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="h-7 rounded bg-[var(--primary)] px-3 text-[11px] font-semibold text-white">确认</button>
            <button onClick={() => setShowAdd(false)} className="h-7 rounded border border-[var(--border)] px-3 text-[11px]">取消</button>
          </div>
        </div>
      )}

      {/* 已有配置表格 */}
      {binds.length > 0 ? (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="min-w-full text-[12px]">
            <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2 text-left">平台</th>
                <th className="px-4 py-2 text-left">服务方式</th>
                <th className="px-4 py-2 text-left">发货方式</th>
                <th className="px-4 py-2 text-left">配送服务</th>
                <th className="px-4 py-2 text-left">覆盖跟踪</th>
                <th className="px-4 py-2 text-left">状态</th>
                <th className="px-4 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {binds.map((b) => (
                <tr key={b.id} className="hover:bg-[var(--surface-subtle)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--foreground)]">{b.platform}</td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">{b.serviceName}</td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">{b.platformShipMethod || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-[var(--muted)]">{b.platformDeliveryService || '—'}</td>
                  <td className="px-4 py-2.5">
                    {b.overrideTracking ? (
                      <span className="inline-flex items-center gap-1 text-amber-600"><Check className="size-3" />是</span>
                    ) : (
                      <span className="text-[var(--muted)]">否</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-2.5">
                    <button className="text-[11px] text-[var(--primary)] hover:underline mr-2">编辑</button>
                    <button className="text-[11px] text-red-500 hover:underline">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
          <RotateCcw className="size-8 text-[var(--muted)] mx-auto mb-2" />
          <p className="text-[12px] text-[var(--muted)]">暂无回传配置。添加后，仓库发货的跟踪号将自动回传给渠道平台。</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// 新增承运商弹窗（完整授权配置）
// 左侧：授权操作指引  右侧：服务商信息 + 授权信息表单
// ═══════════════════════════════════════════════
function NewCarrierModal({ onClose }: { onClose: () => void }) {
  // 基本信息
  const [carrierName, setCarrierName] = useState('');
  const [carrierCode, setCarrierCode] = useState('');
  // 授权信息
  const [apiAddress, setApiAddress] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  // 支付账户
  const [payee, setPayee] = useState('');
  const [payAccount1From, setPayAccount1From] = useState('');
  const [payAccount1To, setPayAccount1To] = useState('');
  const [payAccount2From, setPayAccount2From] = useState('');
  const [payAccount2To, setPayAccount2To] = useState('');
  // 服务方式
  const [selectedService, setSelectedService] = useState('');
  const [costCenter, setCostCenter] = useState('');
  // 状态
  const [activeSection, setActiveSection] = useState<'auth' | 'service'>('auth');

  const handleSubmit = () => {
    if (!carrierName || !carrierCode) return;
    alert(`承运商授权已创建:\n服务商: ${carrierName} (${carrierCode})\nAPI: ${apiAddress}\nAccount: ${accountNumber}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-[960px] max-h-[85vh] rounded-2xl bg-[var(--surface)] shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--foreground)]">新增承运商</h2>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">配置承运商基本信息和 API 授权凭证</p>
          </div>
          <button onClick={onClose} className="rounded p-1.5 hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
        </div>

        {/* 内容区：左右分栏 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：授权操作指引 */}
          <div className="w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--surface-subtle)] p-5 overflow-y-auto">
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] mb-4">授权操作指引</h3>
            <div className="space-y-4 text-[11px]">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
                <p className="font-semibold text-[var(--foreground)]">第一步：登录官方网站</p>
                <p className="text-[var(--muted)]">登录承运商官方网站，进入开发者或 API 管理页面。</p>
                <p className="text-[var(--muted)]">如 UPS: https://www.ups.com/upsdeveloperkit</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
                <p className="font-semibold text-[var(--foreground)]">第二步：进入开发者中心</p>
                <p className="text-[var(--muted)]">进入 API 开发者中心，按引导步骤获取 API 授权凭证：</p>
                <ol className="list-decimal list-inside text-[var(--muted)] space-y-0.5 pl-1">
                  <li>Sign up 或 Login</li>
                  <li>Select an API</li>
                  <li>Download the API documentation</li>
                  <li>Request an access key</li>
                </ol>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
                <p className="font-semibold text-[var(--foreground)]">第三步：创建支付账号</p>
                <p className="text-[var(--muted)]">点击个人中心，进入支付设置创建支付账号，用于运费结算。</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
                <p className="font-semibold text-[var(--foreground)]">第四步：填写右侧表单</p>
                <p className="text-[var(--muted)]">将获取到的凭证信息填入右侧表单完成授权对接。</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-700">
              <p className="font-medium">💡 提示</p>
              <p>授权信息务必与官网一致，否则接口调用会失败。配置完成后请使用「测试连接」验证。</p>
            </div>
          </div>

          {/* 右侧：表单 */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 服务商信息 */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-[var(--foreground)]">服务商</h3>
                <span className="text-[10px] text-[var(--muted)]">服务商代码: {carrierCode || '—'}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">服务商名称 <span className="text-red-500">*</span></label>
                  <input type="text" value={carrierName} onChange={(e) => setCarrierName(e.target.value)} placeholder="如 UPS" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">服务商代码 <span className="text-red-500">*</span></label>
                  <input type="text" value={carrierCode} onChange={(e) => setCarrierCode(e.target.value)} placeholder="如 UPS" className={inputClass} />
                </div>
              </div>
            </section>

            {/* 授权信息 */}
            <section className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-[13px] font-semibold text-[var(--foreground)]">授权信息</h3>
                <div className="flex items-center gap-1">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">默认服务指标</span>
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">支持权</span>
                </div>
                <span className="text-[10px] text-[var(--muted)] ml-auto">获取授权凭证信息以确认已授权，确认后授权数据请勿变更</span>
              </div>

              {/* Tab 切换 */}
              <div className="flex items-center gap-1 mb-4 border-b border-[var(--border-subtle)]">
                <button onClick={() => setActiveSection('auth')} className={cn('px-3 py-2 text-[11px] font-medium border-b-2 transition-colors', activeSection === 'auth' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted)]')}>
                  授权凭证
                </button>
                <button onClick={() => setActiveSection('service')} className={cn('px-3 py-2 text-[11px] font-medium border-b-2 transition-colors', activeSection === 'service' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted)]')}>
                  服务方式 & 支付
                </button>
              </div>

              {activeSection === 'auth' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">* API Address</label>
                    <input type="text" value={apiAddress} onChange={(e) => setApiAddress(e.target.value)} placeholder="https://www.cla.ups.com/webservices/Ship" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">* User Name</label>
                      <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="填入User Name" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">* Password</label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="填入Password" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">* Access Key</label>
                      <input type="text" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} placeholder="填入Access Key" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">Account Number</label>
                      <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="填入Account Number" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">支付人</label>
                    <div className="flex items-center gap-2">
                      <input type="text" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="" className={cn(inputClass, 'flex-1')} />
                      <button className="h-8 shrink-0 rounded-lg border border-[var(--border)] px-2.5 text-[11px] text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
                        <Search className="size-3 inline mr-1" />选择
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'service' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">第一个支付代码(从)</label>
                      <input type="text" value={payAccount1From} onChange={(e) => setPayAccount1From(e.target.value)} placeholder="填入→第一个支付代码(从)" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">填入→第一个支付代码(到)</label>
                      <input type="text" value={payAccount1To} onChange={(e) => setPayAccount1To(e.target.value)} placeholder="填入→第一个支付代码(到)" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">第一个不支付代码(从)</label>
                      <input type="text" value={payAccount2From} onChange={(e) => setPayAccount2From(e.target.value)} placeholder="填入→第一个不支付代码(从)" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">填入→第一个不支付代码(到)</label>
                      <input type="text" value={payAccount2To} onChange={(e) => setPayAccount2To(e.target.value)} placeholder="填入→第一个不支付代码(到)" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">USPSEndorsement</label>
                      <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className={inputClass}>
                        <option value="">No Service Selected</option>
                        <option value="carrier_leave">Carrier Leave If No Response</option>
                        <option value="return_sender">Return to Sender</option>
                        <option value="address_correct">Address Service Requested</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--foreground)] mb-1">* CostCenter</label>
                      <input type="text" value={costCenter} onChange={(e) => setCostCenter(e.target.value)} placeholder="填入CostCenter" className={inputClass} />
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] text-blue-700">
                    <p><a href="#" className="text-[var(--primary)] underline">点击打开服务方式的授权凭证页面</a></p>
                    <p className="mt-1 text-[var(--muted)]">获取凭证→填写EBANX的，纯按在承运商官网的操作，将有凭的信息配置在此处。</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3">
          <button className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
            测试连接
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] font-medium">取消</button>
            <button className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-4 text-[12px] font-medium text-[var(--foreground)]">默认版本号</button>
            <button onClick={handleSubmit} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90">保存授权</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 辅助组件
// ═══════════════════════════════════════════════
function InfoRow({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: boolean }) {
  return (
    <div className="flex items-center">
      <span className="w-[70px] shrink-0 text-[var(--muted)]">{label}</span>
      {badge ? (
        <StatusBadge status={value} />
      ) : (
        <span className={cn('text-[var(--foreground)]', mono && 'font-mono')}>{value || '—'}</span>
      )}
    </div>
  );
}

const inputClass = 'h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]';
