export type Supplier = {
  id: string;
  name: string;
  country: string;
  region: string;
  currency: string;
  contact?: string;
  email?: string;
  tags: string[];
};

export const suppliers: Supplier[] = [
  { id: 'sup_001', name: '深圳华强电子', country: 'CN', region: '深圳', currency: 'CNY', contact: '张伟', email: 'zhang.wei@hqelectronics.cn', tags: ['电子配件', '认证供应商'] },
  { id: 'sup_002', name: 'Shenzhen TechParts Co.', country: 'CN', region: '深圳', currency: 'USD', contact: 'David Chen', email: 'sales@techparts.com', tags: ['电子配件', '智能硬件'] },
  { id: 'sup_003', name: 'Audio Supplies Ltd.', country: 'GB', region: 'London', currency: 'GBP', contact: 'James Wilson', email: 'james@audiosupplies.co.uk', tags: ['音频设备'] },
  { id: 'sup_004', name: '广州科技有限公司', country: 'CN', region: '广州', currency: 'CNY', contact: '李明', email: 'li.ming@gztech.com', tags: ['无线充电', '认证供应商'] },
  { id: 'sup_005', name: 'Global Cable Inc.', country: 'US', region: 'California', currency: 'USD', contact: 'Sarah Lee', email: 'sarah@globalcable.com', tags: ['数据线', '充电器'] },
];
