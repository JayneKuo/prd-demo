import {
  DeliveryMode,
  OutputMode,
  OwnerScopeMode,
  RetailerInfo,
  RuleMatchResult,
  RuleType,
  SkuInfo,
  SkuStatus,
  SyncRule,
} from '../types';

/**
 * 库存同步规则引擎
 * 负责匹配和应用同步规则
 */
export class InventorySyncRuleEngine {
  private rules: SyncRule[] = [];

  constructor(rules: SyncRule[] = []) {
    this.rules = this.sortRulesByPriority(rules);
  }

  private sortRulesByPriority(rules: SyncRule[]): SyncRule[] {
    return [...rules].sort((a, b) => b.priority - a.priority);
  }

  addRule(rule: SyncRule): void {
    const index = this.rules.findIndex((existingRule) => existingRule.id === rule.id);
    if (index >= 0) {
      this.rules[index] = rule;
    } else {
      this.rules.push(rule);
    }
    this.rules = this.sortRulesByPriority(this.rules);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((rule) => rule.id !== ruleId);
  }

  getAllRules(): SyncRule[] {
    return [...this.rules];
  }

  getEnabledRules(): SyncRule[] {
    return this.rules.filter((rule) => rule.enabled);
  }

  matchRules(sku: SkuInfo, retailer: RetailerInfo): RuleMatchResult {
    const matchedRules = this.getEnabledRules().filter((rule) => this.doesRuleMatch(sku, retailer, rule));
    const finalActions = this.applyRules(matchedRules, sku);

    return {
      matchedRules,
      finalActions,
    };
  }

  private doesRuleMatch(sku: SkuInfo, retailer: RetailerInfo, rule: SyncRule): boolean {
    const { conditions } = rule;

    if (conditions.retailerIds && conditions.retailerIds.length > 0 && !conditions.retailerIds.includes(retailer.id)) {
      return false;
    }

    if (!this.matchesOwnerScope(sku, rule)) {
      return false;
    }

    if (conditions.skuStatuses && conditions.skuStatuses.length > 0 && !conditions.skuStatuses.includes(sku.status)) {
      return false;
    }

    if (conditions.warehouseIds && conditions.warehouseIds.length > 0) {
      if (!sku.warehouseId || !conditions.warehouseIds.includes(sku.warehouseId)) {
        return false;
      }
    }

    if (conditions.inventoryRange) {
      const { min, max } = conditions.inventoryRange;
      const availableInventory = sku.inventory.available;

      if (min !== undefined && availableInventory < min) {
        return false;
      }

      if (max !== undefined && availableInventory > max) {
        return false;
      }
    }

    return true;
  }

  private matchesOwnerScope(sku: SkuInfo, rule: SyncRule): boolean {
    const { ownerIds = [], ownerScopeMode = OwnerScopeMode.INCLUDE } = rule.conditions;
    if (ownerIds.length === 0 || ownerScopeMode === OwnerScopeMode.ALL) {
      return true;
    }

    if (!sku.ownerId) {
      return ownerScopeMode !== OwnerScopeMode.INCLUDE;
    }

    const ownerIncluded = ownerIds.includes(sku.ownerId);
    if (ownerScopeMode === OwnerScopeMode.INCLUDE) {
      return ownerIncluded;
    }
    if (ownerScopeMode === OwnerScopeMode.EXCLUDE) {
      return !ownerIncluded;
    }
    return true;
  }

  private applyRules(matchedRules: SyncRule[], sku: SkuInfo): RuleMatchResult['finalActions'] {
    let shouldSync = true;
    let adjustedQuantity = sku.inventory.available;
    let syncPriority = 0;
    let forceZero = sku.status === SkuStatus.UNAVAILABLE;
    let ownerQualified = true;
    let ownerScopedOutput = false;
    let deliveryMode = DeliveryMode.API;
    let outputMode = OutputMode.INVENTORY_ONLY;

    for (const rule of matchedRules) {
      const { actions, conditions, ruleType } = rule;

      if (actions.excludeFromSync) {
        shouldSync = false;
        continue;
      }

      if (conditions.ownerScopeMode === OwnerScopeMode.INCLUDE && conditions.ownerIds?.length) {
        ownerQualified = Boolean(sku.ownerId && conditions.ownerIds.includes(sku.ownerId));
      }

      if (actions.forceZeroForUnavailable && sku.status === SkuStatus.UNAVAILABLE) {
        forceZero = true;
        adjustedQuantity = 0;
      }

      if (actions.inventoryAdjustment !== undefined) {
        if (actions.inventoryAdjustment > 0 && actions.inventoryAdjustment <= 1) {
          adjustedQuantity = Math.floor(sku.inventory.available * actions.inventoryAdjustment);
        } else {
          adjustedQuantity = Math.max(0, sku.inventory.available + actions.inventoryAdjustment);
        }
      }

      if (actions.overrideInventory !== undefined) {
        adjustedQuantity = actions.overrideInventory;
      }

      if (actions.deliveryMode) {
        deliveryMode = actions.deliveryMode;
      } else if (ruleType === RuleType.CHANNEL_SPECIFIC) {
        deliveryMode = DeliveryMode.EDI;
      }

      if (actions.outputMode) {
        outputMode = actions.outputMode;
      }

      if (actions.ownerScopedOutput !== undefined) {
        ownerScopedOutput = actions.ownerScopedOutput;
      } else if (deliveryMode === DeliveryMode.EDI && conditions.ownerScopeMode === OwnerScopeMode.INCLUDE) {
        ownerScopedOutput = true;
      }

      syncPriority = Math.max(syncPriority, rule.priority);
    }

    if (forceZero) {
      adjustedQuantity = 0;
    }

    if (deliveryMode === DeliveryMode.EDI && ownerScopedOutput && !ownerQualified) {
      shouldSync = false;
    }

    return {
      shouldSync,
      adjustedQuantity,
      syncPriority,
      forceZero,
      ownerQualified,
      ownerScopedOutput,
      deliveryMode,
      outputMode,
    };
  }

  batchMatchRules(skus: SkuInfo[], retailer: RetailerInfo): Map<string, RuleMatchResult> {
    const results = new Map<string, RuleMatchResult>();
    for (const sku of skus) {
      results.set(sku.id, this.matchRules(sku, retailer));
    }
    return results;
  }

  validateRule(rule: SyncRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('规则名称不能为空');
    }

    if (rule.priority < 0 || rule.priority > 100) {
      errors.push('规则优先级必须在0-100之间');
    }

    if (rule.actions.inventoryAdjustment !== undefined) {
      if (rule.actions.inventoryAdjustment < -100 || rule.actions.inventoryAdjustment > 100) {
        errors.push('库存调整值必须在-100到100之间');
      }
    }

    if (rule.actions.overrideInventory !== undefined && rule.actions.overrideInventory < 0) {
      errors.push('覆盖库存值不能为负数');
    }

    if (rule.actions.deliveryMode === DeliveryMode.EDI && rule.conditions.ownerScopeMode === OwnerScopeMode.ALL) {
      errors.push('EDI 规则需要明确货主范围，不能使用全部货主');
    }

    if (rule.actions.deliveryMode === DeliveryMode.EDI && rule.conditions.ownerScopeMode === OwnerScopeMode.INCLUDE && (!rule.conditions.ownerIds || rule.conditions.ownerIds.length === 0)) {
      errors.push('EDI 规则必须指定至少一个货主');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static createDefaultRules(): SyncRule[] {
    const now = new Date();

    return [
      {
        id: 'default-unavailable-zero',
        name: '默认：不可用SKU同步为0',
        description: '不可用状态的SKU自动同步库存为0',
        ruleType: RuleType.GLOBAL,
        conditions: {
          skuStatuses: [SkuStatus.UNAVAILABLE, SkuStatus.DISCONTINUED],
        },
        actions: {
          forceZeroForUnavailable: true,
          outputMode: OutputMode.INVENTORY_WITH_STATUS,
        },
        priority: 90,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'default-sync-zero-inventory',
        name: '默认：同步库存为0的SKU',
        description: '包括库存为0的SKU在同步中',
        ruleType: RuleType.GLOBAL,
        conditions: {},
        actions: {
          outputMode: OutputMode.INVENTORY_ONLY,
        },
        priority: 10,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'default-preorder-handling',
        name: '默认：预售库存处理',
        description: '预售状态的SKU可以同步',
        ruleType: RuleType.GLOBAL,
        conditions: {
          skuStatuses: [SkuStatus.PREORDER],
        },
        actions: {
          outputMode: OutputMode.INVENTORY_WITH_STATUS,
        },
        priority: 20,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
