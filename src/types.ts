export type SqlDialect = 'PostgreSQL' | 'MySQL' | 'SQLite' | 'MSSQL' | 'Oracle';

export type ColumnType =
  | 'INT'
  | 'BIGINT'
  | 'SERIAL'
  | 'BIGSERIAL'
  | 'VARCHAR'
  | 'TEXT'
  | 'UUID'
  | 'BOOLEAN'
  | 'DECIMAL'
  | 'FLOAT'
  | 'TIMESTAMP'
  | 'TIMESTAMPTZ'
  | 'DATE'
  | 'JSONB'
  | 'ENUM';

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  lengthOrPrecision?: string;
  isPk: boolean;
  isFk: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
  comment?: string;
  isIndexed?: boolean;
}

export interface Table {
  id: string;
  name: string;
  comment?: string;
  x: number;
  y: number;
  color: string;
  columns: Column[];
  // Styling overrides
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
  hasShadow?: boolean;
}

export type RelationType = '1:1' | '1:N' | 'N:M';
export type CascadeRule = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  type: RelationType;
  onDelete: CascadeRule;
  onUpdate: CascadeRule;
  name?: string;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export type DiagramShapeType =
  | 'rectangle'
  | 'rounded'
  | 'text'
  | 'heading'
  | 'ellipse'
  | 'circle'
  | 'square'
  | 'process'
  | 'diamond'
  | 'parallelogram'
  | 'hexagon'
  | 'triangle'
  | 'cylinder'
  | 'cloud'
  | 'document'
  | 'callout'
  | 'speech_bubble'
  | 'actor'
  | 'crescent'
  | 'table_grid'
  | 'sticky_note'
  | 'cube_3d'
  | 'gear'
  | 'uml_class'
  | 'uml_interface'
  | 'uml_package'
  | 'uml_usecase'
  | 'erd_entity'
  | 'erd_weak_entity'
  | 'erd_attribute'
  | 'erd_relationship';

export interface DiagramShape {
  id: string;
  type: DiagramShapeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  textColor: string;
  fontSize: number;
  isRounded?: boolean;
  hasShadow?: boolean;
  isSketch?: boolean;
  opacity?: number;
  content?: string;
  extraData?: {
    attributes?: string[];
    methods?: string[];
    isWeak?: boolean;
    isMultiValued?: boolean;
    isDerived?: boolean;
    isPk?: boolean;
  };
}

export interface CanvasSettings {
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  showPageView: boolean;
  paperSize: 'A4' | 'A3' | 'Letter' | 'Infinite';
  paperOrientation: 'portrait' | 'landscape';
  hasCustomBg: boolean;
  bgColor: string;
  showConnectionArrows: boolean;
  showConnectionPoints: boolean;
  snapGuides: boolean;
  roundedCorners: boolean;
  sketchMode: boolean;
  dropShadow: boolean;
  selectedThemeIndex?: number;
}

export interface ThemePreset {
  id: string;
  name: string;
  fill: string;
  stroke: string;
  text: string;
  connector: string;
}

export interface Schema {
  id: string;
  name: string;
  dialect: SqlDialect;
  version: number;
  tables: Table[];
  relationships: Relationship[];
  shapes?: DiagramShape[];
  canvasSettings?: CanvasSettings;
}

export type UserRole = 'Super Admin' | 'Database Architect' | 'Schema Editor' | 'Read-Only Analyst' | 'DevOps / Auditor';

export interface UserPermission {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  status: 'active' | 'suspended' | 'invited';
  permissions: {
    canEditSchema: boolean;
    canDropTables: boolean;
    canExecuteQueries: boolean;
    canExportSql: boolean;
    canCommitGit: boolean;
    canManageAccess: boolean;
    canViewAudit: boolean;
  };
  lastActive: string;
}

export interface ChangeNotification {
  id: string;
  title: string;
  description: string;
  type: 'table_created' | 'table_updated' | 'table_deleted' | 'column_added' | 'column_modified' | 'relation_created' | 'relation_deleted' | 'git_committed' | 'sql_executed';
  timestamp: string;
  author: string;
  read: boolean;
}

export interface GitCommitRecord {
  id: string;
  hash: string;
  message: string;
  branch: string;
  author: string;
  timestamp: string;
  migrationFile: string;
  tablesCount: number;
  changesSummary: string;
}

export interface ErrorDiagnostic {
  title: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  rootCause: string;
  immediateFix: string;
  prevention: string;
  troubleshootingCommands?: string[];
}

export interface QueryOptimizationResult {
  analysis: string;
  bottlenecks: string[];
  recommendations: string[];
  optimizedQuery: string;
  suggestedIndexes: string[];
  estimatedSpeedup: string;
}
