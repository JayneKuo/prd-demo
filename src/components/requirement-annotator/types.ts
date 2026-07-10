export type RequirementElementType =
  | 'field'
  | 'button'
  | 'table-column'
  | 'filter'
  | 'section'
  | 'card'
  | 'navigation'
  | 'other';

export type RequirementSource = 'ai' | 'manual' | 'edited-ai';

export type RequirementStatus = 'draft' | 'confirmed' | 'todo' | 'implemented';

export type RequirementRuleType = 'business' | 'interaction' | 'data' | 'validation' | 'permission' | 'acceptance' | 'other';

export type RequirementRule = {
  id: string;
  subject?: string;
  type?: RequirementRuleType;
  description: string;
  condition?: string;
  behavior?: string;
  notes?: string;
};

export type RequirementScope = 'module' | 'page' | 'section' | 'field' | 'action' | 'flow' | 'other';

export type RequirementGroup = '模块说明' | '页面说明' | '筛选区' | '表格字段' | '页面操作' | '业务流程' | '其他';

export type RequirementTarget = {
  selector?: string;
  prdId?: string;
  label?: string;
  elementType: RequirementElementType;
};

export type RequirementAnnotation = {
  id: string;
  pageId: string;
  route: string;
  markerOffset?: { x: number; y: number };
  scope?: RequirementScope;
  group?: RequirementGroup;
  order?: number;
  target: RequirementTarget;
  content: {
    title: string;
    description: string;
    businessRule?: string;
    interactionRule?: string;
    dataSource?: string;
    validationRule?: string;
    permissionRule?: string;
    rules?: RequirementRule[];
    acceptanceCriteria: string[];
    openQuestions: string[];
  };
  source: RequirementSource;
  status: RequirementStatus;
};

export type RequirementFlowStep = {
  order: number;
  action: string;
  targetAnnotationId?: string;
  expectedResult: string;
  exception?: string;
};

export type RequirementFlow = {
  id: string;
  pageId: string;
  title: string;
  actor?: string;
  trigger: string;
  preconditions: string[];
  steps: RequirementFlowStep[];
  endState: string;
  openQuestions: string[];
};

export type RequirementPageDocument = {
  pageId: string;
  route: string;
  title: string;
  goal?: string;
  actors: string[];
  annotations: RequirementAnnotation[];
  flows: RequirementFlow[];
  updatedAt: string;
};

export type RequirementTargetDraft = RequirementTarget & {
  route: string;
  pageId: string;
};

export type RequirementTreeNodeType = 'module' | 'page' | 'section' | 'field' | 'action' | 'flow' | 'other';

export type RequirementNodeContent = {
  description: string;
  goal?: string;
  actors: string[];
  businessRule?: string;
  interactionRule?: string;
  dataSource?: string;
  validationRule?: string;
  permissionRule?: string;
  rules: RequirementRule[];
  acceptanceCriteria: string[];
  openQuestions: string[];
  status: RequirementStatus;
  flow?: {
    actor?: string;
    trigger: string;
    preconditions: string[];
    steps: RequirementFlowStep[];
    endState: string;
  };
};

export type RequirementTreeNode = {
  id: string;
  type: RequirementTreeNodeType;
  title: string;
  route?: string;
  pageId?: string;
  target?: RequirementTarget;
  markerOffset?: { x: number; y: number };
  source?: RequirementSource;
  order: number;
  content: RequirementNodeContent;
  children: RequirementTreeNode[];
};

export type RequirementProjectDocument = {
  schemaVersion: 2;
  projectName: string;
  pageId: string;
  route: string;
  rootNodes: RequirementTreeNode[];
  updatedAt: string;
};

export type RequirementDocument = RequirementPageDocument | RequirementProjectDocument;
