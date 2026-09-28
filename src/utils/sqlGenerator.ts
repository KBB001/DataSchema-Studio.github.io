import { Column, ColumnType, Relationship, Schema, SqlDialect, Table } from '../types';

export interface SqlExportOptions {
  dialect: SqlDialect;
  includeDropTable: boolean;
  includeIfNotExists?: boolean;
  includeForeignKeys: boolean;
  foreignKeyStyle?: 'alter' | 'inline';
  includeIndexes: boolean;
  includeComments: boolean;
  includeSchemaPrefix?: string;
  selectedTableId?: string;
}

// Map column data types across dialects
export function mapDataType(col: Column, dialect: SqlDialect): string {
  const precision = col.lengthOrPrecision ? `(${col.lengthOrPrecision})` : '';

  switch (dialect) {
    case 'MySQL':
      switch (col.type) {
        case 'INT':
          return 'INT';
        case 'BIGINT':
          return 'BIGINT';
        case 'SERIAL':
          return 'INT AUTO_INCREMENT';
        case 'BIGSERIAL':
          return 'BIGINT AUTO_INCREMENT';
        case 'VARCHAR':
          return `VARCHAR${precision || '(255)'}`;
        case 'TEXT':
          return 'TEXT';
        case 'UUID':
          return 'VARCHAR(36)';
        case 'BOOLEAN':
          return 'TINYINT(1)';
        case 'DECIMAL':
          return `DECIMAL${precision || '(12,2)'}`;
        case 'FLOAT':
          return 'DOUBLE';
        case 'TIMESTAMP':
        case 'TIMESTAMPTZ':
          return 'DATETIME';
        case 'DATE':
          return 'DATE';
        case 'JSONB':
          return 'JSON';
        case 'ENUM':
          return `VARCHAR(50)`;
        default:
          return 'VARCHAR(255)';
      }

    case 'SQLite':
      switch (col.type) {
        case 'INT':
        case 'BIGINT':
        case 'SERIAL':
        case 'BIGSERIAL':
          return 'INTEGER';
        case 'VARCHAR':
        case 'TEXT':
        case 'UUID':
        case 'ENUM':
        case 'JSONB':
          return 'TEXT';
        case 'BOOLEAN':
          return 'INTEGER';
        case 'DECIMAL':
        case 'FLOAT':
          return 'REAL';
        case 'TIMESTAMP':
        case 'TIMESTAMPTZ':
        case 'DATE':
          return 'TEXT';
        default:
          return 'TEXT';
      }

    case 'MSSQL':
      switch (col.type) {
        case 'INT':
          return 'INT';
        case 'BIGINT':
          return 'BIGINT';
        case 'SERIAL':
          return 'INT IDENTITY(1,1)';
        case 'BIGSERIAL':
          return 'BIGINT IDENTITY(1,1)';
        case 'VARCHAR':
          return `NVARCHAR${precision || '(255)'}`;
        case 'TEXT':
          return 'NVARCHAR(MAX)';
        case 'UUID':
          return 'UNIQUEIDENTIFIER';
        case 'BOOLEAN':
          return 'BIT';
        case 'DECIMAL':
          return `DECIMAL${precision || '(12,2)'}`;
        case 'FLOAT':
          return 'FLOAT';
        case 'TIMESTAMP':
        case 'TIMESTAMPTZ':
          return 'DATETIME2';
        case 'DATE':
          return 'DATE';
        case 'JSONB':
          return 'NVARCHAR(MAX)';
        case 'ENUM':
          return 'NVARCHAR(50)';
        default:
          return 'NVARCHAR(255)';
      }

    case 'Oracle':
      switch (col.type) {
        case 'INT':
          return 'NUMBER(10)';
        case 'BIGINT':
          return 'NUMBER(19)';
        case 'SERIAL':
          return 'NUMBER(10) GENERATED ALWAYS AS IDENTITY';
        case 'BIGSERIAL':
          return 'NUMBER(19) GENERATED ALWAYS AS IDENTITY';
        case 'VARCHAR':
          return `VARCHAR2${precision || '(255)'}`;
        case 'TEXT':
          return 'CLOB';
        case 'UUID':
          return 'VARCHAR2(36)';
        case 'BOOLEAN':
          return 'NUMBER(1)';
        case 'DECIMAL':
          return `NUMBER${precision || '(12,2)'}`;
        case 'FLOAT':
          return 'FLOAT';
        case 'TIMESTAMP':
          return 'TIMESTAMP';
        case 'TIMESTAMPTZ':
          return 'TIMESTAMP WITH TIME ZONE';
        case 'DATE':
          return 'DATE';
        case 'JSONB':
          return 'CLOB';
        case 'ENUM':
          return 'VARCHAR2(50)';
        default:
          return 'VARCHAR2(255)';
      }

    case 'PostgreSQL':
    default:
      switch (col.type) {
        case 'INT':
          return 'INTEGER';
        case 'BIGINT':
          return 'BIGINT';
        case 'SERIAL':
          return 'SERIAL';
        case 'BIGSERIAL':
          return 'BIGSERIAL';
        case 'VARCHAR':
          return `VARCHAR${precision || '(255)'}`;
        case 'TEXT':
          return 'TEXT';
        case 'UUID':
          return 'UUID';
        case 'BOOLEAN':
          return 'BOOLEAN';
        case 'DECIMAL':
          return `DECIMAL${precision || '(12,2)'}`;
        case 'FLOAT':
          return 'DOUBLE PRECISION';
        case 'TIMESTAMP':
          return 'TIMESTAMP';
        case 'TIMESTAMPTZ':
          return 'TIMESTAMPTZ';
        case 'DATE':
          return 'DATE';
        case 'JSONB':
          return 'JSONB';
        case 'ENUM':
          return 'VARCHAR(50)';
        default:
          return 'VARCHAR(255)';
      }
  }
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

function quoteIdent(name: string, dialect: SqlDialect): string {
  if (dialect === 'MySQL') return `\`${name}\``;
  if (dialect === 'MSSQL') return `[${name}]`;
  if (dialect === 'PostgreSQL' || dialect === 'Oracle') return `"${name}"`;
  return name;
}

// Generate DDL SQL
export function generateSql(schema: Schema, options: SqlExportOptions): string {
  const {
    dialect,
    includeDropTable,
    includeIfNotExists = true,
    includeForeignKeys,
    foreignKeyStyle = 'alter',
    includeIndexes,
    includeComments,
    includeSchemaPrefix = '',
    selectedTableId,
  } = options;

  const lines: string[] = [];
  const targetTables = selectedTableId
    ? schema.tables.filter((t) => t.id === selectedTableId)
    : schema.tables;

  const prefix = includeSchemaPrefix ? `${includeSchemaPrefix}.` : '';

  lines.push(`-- ========================================================`);
  lines.push(`-- Schema: ${schema.name || 'Application_Database'}`);
  lines.push(`-- Target Dialect: ${dialect}`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Tables: ${targetTables.length} | Relations: ${schema.relationships.length}`);
  lines.push(`-- DataSchema Studio Architecture Modeler`);
  lines.push(`-- ========================================================\n`);

  if (dialect === 'PostgreSQL') {
    lines.push(`-- Enable common extensions`);
    lines.push(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    lines.push(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n`);
  }

  // 1. DROP TABLE statements
  if (includeDropTable) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Cleanup / Drop existing tables`);
    lines.push(`-- --------------------------------------------------------`);
    const reverseTables = [...targetTables].reverse();
    for (const table of reverseTables) {
      const qName = `${prefix}${quoteIdent(table.name, dialect)}`;
      if (dialect === 'PostgreSQL') {
        lines.push(`DROP TABLE IF EXISTS ${qName} CASCADE;`);
      } else if (dialect === 'MySQL') {
        lines.push(`DROP TABLE IF EXISTS ${qName};`);
      } else if (dialect === 'MSSQL') {
        lines.push(`IF OBJECT_ID('${table.name}', 'U') IS NOT NULL DROP TABLE ${qName};`);
      } else if (dialect === 'Oracle') {
        lines.push(`BEGIN EXECUTE IMMEDIATE 'DROP TABLE ${qName} CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;\n/`);
      } else {
        lines.push(`DROP TABLE IF EXISTS ${qName};`);
      }
    }
    lines.push('');
  }

  // 2. CREATE TABLE statements
  for (const table of targetTables) {
    if (includeComments && table.comment) {
      lines.push(`-- Table: ${table.name}`);
      lines.push(`-- Description: ${table.comment}`);
    }

    const ifNotExistsClause = includeIfNotExists && (dialect === 'PostgreSQL' || dialect === 'MySQL' || dialect === 'SQLite')
      ? 'IF NOT EXISTS '
      : '';
    const qTableName = `${prefix}${quoteIdent(table.name, dialect)}`;

    lines.push(`CREATE TABLE ${ifNotExistsClause}${qTableName} (`);

    const columnDefs: string[] = [];
    const pkColumns = table.columns.filter((c) => c.isPk);

    for (const col of table.columns) {
      let colDef = `    ${quoteIdent(col.name, dialect)} ${mapDataType(col, dialect)}`;

      // SQLite special inline primary key autoincrement
      if (dialect === 'SQLite' && col.isPk && (col.type === 'SERIAL' || col.type === 'BIGSERIAL' || col.type === 'INT' || col.type === 'BIGINT')) {
        colDef += ' PRIMARY KEY AUTOINCREMENT';
      } else {
        if (!col.isNullable && !col.isPk) {
          colDef += ' NOT NULL';
        }

        if (col.isUnique && !col.isPk) {
          colDef += ' UNIQUE';
        }

        if (col.defaultValue && col.defaultValue.trim() !== '') {
          colDef += ` DEFAULT ${col.defaultValue}`;
        }
      }

      // Inline comments for MySQL
      if (includeComments && dialect === 'MySQL' && col.comment) {
        colDef += ` COMMENT '${escapeSql(col.comment)}'`;
      }

      columnDefs.push(colDef);
    }

    // Add Primary Key constraint (if not sqlite auto-handled)
    if (pkColumns.length > 0 && !(dialect === 'SQLite' && pkColumns.length === 1 && (pkColumns[0].type === 'SERIAL' || pkColumns[0].type === 'BIGSERIAL'))) {
      const pkNames = pkColumns.map((c) => quoteIdent(c.name, dialect)).join(', ');
      columnDefs.push(`    CONSTRAINT pk_${table.name} PRIMARY KEY (${pkNames})`);
    }

    // Inline Foreign Keys if requested
    if (includeForeignKeys && foreignKeyStyle === 'inline') {
      const tableRels = schema.relationships.filter((r) => r.sourceTableId === table.id);
      for (const rel of tableRels) {
        const srcCol = table.columns.find((c) => c.id === rel.sourceColumnId);
        const tgtTable = schema.tables.find((t) => t.id === rel.targetTableId);
        const tgtCol = tgtTable?.columns.find((c) => c.id === rel.targetColumnId);
        if (srcCol && tgtTable && tgtCol) {
          const onDel = rel.onDelete ? ` ON DELETE ${rel.onDelete}` : '';
          const onUpd = rel.onUpdate ? ` ON UPDATE ${rel.onUpdate}` : '';
          columnDefs.push(
            `    FOREIGN KEY (${quoteIdent(srcCol.name, dialect)}) REFERENCES ${prefix}${quoteIdent(tgtTable.name, dialect)} (${quoteIdent(tgtCol.name, dialect)})${onDel}${onUpd}`
          );
        }
      }
    }

    let createTableClosing = ');\n';
    if (dialect === 'MySQL') {
      const tableComment = includeComments && table.comment ? ` COMMENT='${escapeSql(table.comment)}'` : '';
      createTableClosing = `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci${tableComment};\n`;
    }

    lines.push(columnDefs.join(',\n'));
    lines.push(createTableClosing);

    // PostgreSQL Comments
    if (includeComments && dialect === 'PostgreSQL') {
      if (table.comment) {
        lines.push(`COMMENT ON TABLE ${qTableName} IS '${escapeSql(table.comment)}';`);
      }
      for (const col of table.columns) {
        if (col.comment) {
          lines.push(`COMMENT ON COLUMN ${qTableName}.${quoteIdent(col.name, dialect)} IS '${escapeSql(col.comment)}';`);
        }
      }
      lines.push('');
    }
  }

  // 3. Foreign Key Constraints (ALTER TABLE style)
  if (includeForeignKeys && foreignKeyStyle === 'alter' && schema.relationships.length > 0) {
    const relevantRels = schema.relationships.filter((rel) => {
      if (!selectedTableId) return true;
      return rel.sourceTableId === selectedTableId || rel.targetTableId === selectedTableId;
    });

    if (relevantRels.length > 0) {
      lines.push(`-- --------------------------------------------------------`);
      lines.push(`-- Foreign Key Constraints`);
      lines.push(`-- --------------------------------------------------------`);

      for (const rel of relevantRels) {
        const srcTable = schema.tables.find((t) => t.id === rel.sourceTableId);
        const tgtTable = schema.tables.find((t) => t.id === rel.targetTableId);
        const srcCol = srcTable?.columns.find((c) => c.id === rel.sourceColumnId);
        const tgtCol = tgtTable?.columns.find((c) => c.id === rel.targetColumnId);

        if (!srcTable || !tgtTable || !srcCol || !tgtCol) continue;

        const constraintName = rel.name || `fk_${srcTable.name}_${srcCol.name}`;
        const onDel = rel.onDelete ? ` ON DELETE ${rel.onDelete}` : '';
        const onUpd = rel.onUpdate ? ` ON UPDATE ${rel.onUpdate}` : '';

        const qSrcTable = `${prefix}${quoteIdent(srcTable.name, dialect)}`;
        const qTgtTable = `${prefix}${quoteIdent(tgtTable.name, dialect)}`;
        const qSrcCol = quoteIdent(srcCol.name, dialect);
        const qTgtCol = quoteIdent(tgtCol.name, dialect);

        lines.push(
          `ALTER TABLE ${qSrcTable} ADD CONSTRAINT ${constraintName} ` +
          `FOREIGN KEY (${qSrcCol}) REFERENCES ${qTgtTable} (${qTgtCol})${onDel}${onUpd};`
        );
      }
      lines.push('');
    }
  }

  // 4. Indexes
  if (includeIndexes) {
    const indexedCols: { table: Table; column: Column }[] = [];
    for (const table of targetTables) {
      for (const col of table.columns) {
        if ((col.isIndexed || col.isFk) && !col.isPk) {
          indexedCols.push({ table, column: col });
        }
      }
    }

    if (indexedCols.length > 0) {
      lines.push(`-- --------------------------------------------------------`);
      lines.push(`-- Performance & Foreign Key Indexes`);
      lines.push(`-- --------------------------------------------------------`);

      for (const { table, column } of indexedCols) {
        const idxName = `idx_${table.name}_${column.name}`;
        const qTable = `${prefix}${quoteIdent(table.name, dialect)}`;
        const qCol = quoteIdent(column.name, dialect);
        lines.push(`CREATE INDEX ${idxName} ON ${qTable} (${qCol});`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// Generate Realistic Seed Data (INSERT statements)
export function generateSeedDataSql(schema: Schema, dialect: SqlDialect, rowsPerTable: number = 5): string {
  const lines: string[] = [];
  lines.push(`-- ========================================================`);
  lines.push(`-- Seed Data Generator: ${schema.name}`);
  lines.push(`-- Dialect: ${dialect} | Rows per table: ${rowsPerTable}`);
  lines.push(`-- Preserves Primary Key and Foreign Key integrity`);
  lines.push(`-- ========================================================\n`);

  // Dependency graph topological sort to insert parents before children
  const sortedTables = topologicalSortTables(schema);

  // Keep track of generated IDs per table to reference in FKs
  const generatedIds: Record<string, any[]> = {};

  for (const table of sortedTables) {
    lines.push(`-- Seed table: ${table.name}`);
    const tableIds: any[] = [];
    const nonPkCols = table.columns.filter((c) => !c.isPk || c.type === 'UUID');

    const colNames = table.columns.map((c) => quoteIdent(c.name, dialect)).join(', ');

    for (let i = 1; i <= rowsPerTable; i++) {
      const rowValues: string[] = [];

      for (const col of table.columns) {
        // Handle Primary Key
        if (col.isPk) {
          if (col.type === 'UUID') {
            const uuidVal = generateFakeUuid(table.name, i);
            tableIds.push(`'${uuidVal}'`);
            rowValues.push(`'${uuidVal}'`);
          } else {
            tableIds.push(i);
            rowValues.push(String(i));
          }
          continue;
        }

        // Handle Foreign Key
        if (col.isFk) {
          const rel = schema.relationships.find(
            (r) => r.sourceTableId === table.id && r.sourceColumnId === col.id
          );
          if (rel && generatedIds[rel.targetTableId] && generatedIds[rel.targetTableId].length > 0) {
            const targetIds = generatedIds[rel.targetTableId];
            const chosenId = targetIds[(i - 1) % targetIds.length];
            rowValues.push(String(chosenId));
            continue;
          }
        }

        // Generate contextual mock value based on column name & type
        const mockVal = generateContextualMockValue(col.name, col.type, i, table.name);
        rowValues.push(mockVal);
      }

      const qTableName = quoteIdent(table.name, dialect);
      lines.push(`INSERT INTO ${qTableName} (${colNames}) VALUES (${rowValues.join(', ')});`);
    }

    generatedIds[table.id] = tableIds;
    lines.push('');
  }

  return lines.join('\n');
}

function topologicalSortTables(schema: Schema): Table[] {
  const result: Table[] = [];
  const visited = new Set<string>();

  function visit(tableId: string) {
    if (visited.has(tableId)) return;
    visited.add(tableId);

    // Visit parents first (tables that this table references)
    const outgoingRels = schema.relationships.filter((r) => r.sourceTableId === tableId);
    for (const rel of outgoingRels) {
      if (rel.targetTableId !== tableId) {
        visit(rel.targetTableId);
      }
    }

    const t = schema.tables.find((tbl) => tbl.id === tableId);
    if (t && !result.some((item) => item.id === t.id)) {
      result.push(t);
    }
  }

  schema.tables.forEach((t) => visit(t.id));
  return result;
}

function generateFakeUuid(tablePrefix: string, index: number): string {
  const hex = (index + 1000).toString(16).padStart(4, '0');
  return `00000000-0000-4000-8000-${hex.padStart(12, '0')}`;
}

function generateContextualMockValue(colName: string, type: ColumnType, index: number, tableName: string): string {
  const name = colName.toLowerCase();

  if (name.includes('email')) {
    return `'user${index}@demo-service.org'`;
  }
  if (name.includes('phone')) {
    return `'+7 (701) ${100 + index}-44-${20 + index}'`;
  }
  if (name.includes('first_name') || name.includes('username')) {
    const names = ['alex', 'elena', 'marat', 'dmitry', 'sofia', 'timur', 'anna', 'ruslan'];
    return `'${names[(index - 1) % names.length]}_${index}'`;
  }
  if (name.includes('name') || name.includes('title')) {
    return `'${tableName.replace(/s$/, '')}_item_${index}'`;
  }
  if (name.includes('status')) {
    const statuses = ["'ACTIVE'", "'COMPLETED'", "'PROCESSING'", "'PENDING'"];
    return statuses[(index - 1) % statuses.length];
  }
  if (name.includes('price') || name.includes('amount') || name.includes('cost') || name.includes('salary')) {
    return `${(index * 49.99 + 10).toFixed(2)}`;
  }
  if (name.includes('qty') || name.includes('quantity') || name.includes('count')) {
    return `${index * 2 + 1}`;
  }
  if (name.includes('rating') || name.includes('score')) {
    return `${(4.0 + (index % 10) * 0.1).toFixed(2)}`;
  }
  if (name.includes('address')) {
    return `'ул. Абая, д. ${index * 12}, офис ${index * 5}'`;
  }
  if (name.includes('sku') || name.includes('code') || name.includes('ref')) {
    return `'SKU-${tableName.toUpperCase().slice(0, 3)}-${1000 + index}'`;
  }
  if (name.includes('password') || name.includes('hash')) {
    return `'$2a$12$e8Y4vLd7Z9mK1p3...'`;
  }
  if (type === 'BOOLEAN') {
    return index % 2 === 0 ? 'true' : 'false';
  }
  if (type === 'DATE') {
    return `'2026-0${Math.min(9, Math.max(1, index))}-15'`;
  }
  if (type === 'TIMESTAMP' || type === 'TIMESTAMPTZ') {
    return `'2026-03-${String(10 + (index % 15)).padStart(2, '0')} 14:30:00'`;
  }
  if (type === 'JSONB') {
    return `'{"tier": "standard", "tags": ["prod", "v${index}"]}'`;
  }
  if (type === 'INT' || type === 'BIGINT') {
    return `${index * 10}`;
  }
  if (type === 'DECIMAL' || type === 'FLOAT') {
    return `${(index * 15.5).toFixed(2)}`;
  }
  if (type === 'UUID') {
    return `'${generateFakeUuid(colName, index)}'`;
  }

  return `'Значение_${index}'`;
}

// Generate Mermaid ER Diagram Syntax
export function generateMermaidErDiagram(schema: Schema): string {
  const lines: string[] = ['erDiagram'];

  for (const table of schema.tables) {
    lines.push(`    ${table.name} {`);
    for (const col of table.columns) {
      const pkMarker = col.isPk ? 'PK' : col.isFk ? 'FK' : '';
      const typeStr = col.type.toLowerCase();
      lines.push(`        ${typeStr} ${col.name} ${pkMarker}`);
    }
    lines.push(`    }`);
  }

  for (const rel of schema.relationships) {
    const src = schema.tables.find((t) => t.id === rel.sourceTableId);
    const tgt = schema.tables.find((t) => t.id === rel.targetTableId);
    if (!src || !tgt) continue;

    // Cardinality symbols in Mermaid:
    // ||--o{ (1 to many), ||--|| (1 to 1), }o--o{ (many to many)
    let cardSymbol = '||--o{';
    if (rel.type === '1:1') cardSymbol = '||--||';
    if (rel.type === 'N:M') cardSymbol = '}o--o{';

    const label = rel.name ? `"${rel.name}"` : '"references"';
    lines.push(`    ${tgt.name} ${cardSymbol} ${src.name} : ${label}`);
  }

  return lines.join('\n');
}

// Generate DBML (Database Markup Language) format
export function generateDbml(schema: Schema): string {
  const lines: string[] = [];
  lines.push(`// DBML Schema: ${schema.name}`);
  lines.push(`// Generated by DataSchema Studio\n`);

  for (const table of schema.tables) {
    lines.push(`Table ${table.name} {`);
    for (const col of table.columns) {
      const settings: string[] = [];
      if (col.isPk) settings.push('pk');
      if (col.isUnique && !col.isPk) settings.push('unique');
      if (!col.isNullable && !col.isPk) settings.push('not null');
      if (col.defaultValue) settings.push(`default: \`${col.defaultValue}\``);
      if (col.comment) settings.push(`note: '${escapeSql(col.comment)}'`);

      const settingStr = settings.length > 0 ? ` [${settings.join(', ')}]` : '';
      lines.push(`  ${col.name} ${col.type.toLowerCase()}${settingStr}`);
    }
    if (table.comment) {
      lines.push(`  Note: '${escapeSql(table.comment)}'`);
    }
    lines.push(`}\n`);
  }

  for (const rel of schema.relationships) {
    const src = schema.tables.find((t) => t.id === rel.sourceTableId);
    const tgt = schema.tables.find((t) => t.id === rel.targetTableId);
    const srcCol = src?.columns.find((c) => c.id === rel.sourceColumnId);
    const tgtCol = tgt?.columns.find((c) => c.id === rel.targetColumnId);
    if (src && tgt && srcCol && tgtCol) {
      const relOp = rel.type === '1:1' ? '-' : '>';
      lines.push(`Ref: ${src.name}.${srcCol.name} ${relOp} ${tgt.name}.${tgtCol.name}`);
    }
  }

  return lines.join('\n');
}

// Generate Versioned SQL Migration (Flyway/Liquibase)
export function generateMigrationScript(schema: Schema, dialect: SqlDialect): { upSql: string; downSql: string; filename: string } {
  const upSql = generateSql(schema, {
    dialect,
    includeDropTable: false,
    includeForeignKeys: true,
    includeIndexes: true,
    includeComments: true,
  });

  const downSql = schema.tables
    .map((t) => `DROP TABLE IF EXISTS ${quoteIdent(t.name, dialect)} CASCADE;`)
    .reverse()
    .join('\n');

  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const filename = `V${timestamp}__init_${schema.name.toLowerCase()}.sql`;

  return { upSql, downSql, filename };
}

// Robust, multi-line aware AST parser for raw SQL DDL
export function parseSqlDdl(sql: string): { tables: Table[]; relationships: Relationship[] } {
  const stripQuotes = (s: string): string => s.replace(/[`"\[\]\s]/g, '');
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  // Remove single line and multiline comments
  const cleanSql = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  // Find CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\.)?[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s*\(([\s\S]*?)\)(?:\s*ENGINE\s*=\s*[a-zA-Z0-9_]+)?(?:\s*DEFAULT\s+CHARSET\s*=\s*[a-zA-Z0-9_]+)?(?:\s*COMMENT\s*=\s*'[^']*')?\s*;/gi;

  let match: RegExpExecArray | null;
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];
  let colorIdx = 0;
  let currentX = 80;
  let currentY = 80;

  while ((match = createTableRegex.exec(cleanSql)) !== null) {
    const tableName = match[2];
    const tableBody = match[3];
    const tableId = `tbl_${tableName.toLowerCase()}`;

    const columns: Column[] = [];

    // Split body into comma-separated items, respecting nested parentheses like DECIMAL(12, 2)
    const rawTokens: string[] = [];
    let currentToken = '';
    let parenDepth = 0;

    for (let i = 0; i < tableBody.length; i++) {
      const char = tableBody[i];
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;

      if (char === ',' && parenDepth === 0) {
        if (currentToken.trim()) rawTokens.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    if (currentToken.trim()) rawTokens.push(currentToken.trim());

    // Process each token
    for (const rawItem of rawTokens) {
      const item = rawItem.trim();
      if (!item) continue;

      // Table-level PRIMARY KEY constraint
      if (/^(CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?PRIMARY\s+KEY/i.test(item)) {
        const pkMatch = item.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const pkCols = pkMatch[1].split(',').map((c) => c.replace(/[`"\[\]\s]/g, ''));
          for (const pkCol of pkCols) {
            const found = columns.find((c) => c.name.toLowerCase() === pkCol.toLowerCase());
            if (found) found.isPk = true;
          }
        }
        continue;
      }

      // Table-level FOREIGN KEY constraint
      if (/^(CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?FOREIGN\s+KEY/i.test(item)) {
        const fkMatch = item.match(/FOREIGN\s+KEY\s*\([`"\[]?([a-zA-Z0-9_]+)[`"\]]?\)\s*REFERENCES\s+[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s*\([`"\[]?([a-zA-Z0-9_]+)[`"\]]?\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i);
        if (fkMatch) {
          const colName = fkMatch[1].toLowerCase();
          const targetTable = fkMatch[2].toLowerCase();
          const targetCol = fkMatch[3].toLowerCase();
          const onDel = (fkMatch[4]?.toUpperCase() || 'CASCADE') as any;
          const onUpd = (fkMatch[5]?.toUpperCase() || 'CASCADE') as any;

          relationships.push({
            id: `rel_${tableName}_${targetTable}_${Math.random().toString(36).substring(2, 7)}`,
            sourceTableId: tableId,
            sourceColumnId: `c_${tableName}_${colName}`,
            targetTableId: `tbl_${targetTable}`,
            targetColumnId: `c_${targetTable}_${targetCol}`,
            type: '1:N',
            onDelete: onDel,
            onUpdate: onUpd,
            name: `fk_${tableName}_${colName}`
          });

          const foundCol = columns.find((c) => c.name.toLowerCase() === colName);
          if (foundCol) foundCol.isFk = true;
        }
        continue;
      }

      // Column Definition
      const colMatch = item.match(/^[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s+([A-Za-z0-9_]+(?:\s*\([^)]+\))?)([\s\S]*)$/);
      if (colMatch) {
        const colName = colMatch[1];
        const rawType = colMatch[2].toUpperCase();
        const modifiers = (colMatch[3] || '').toUpperCase();

        const isPk = modifiers.includes('PRIMARY KEY') || rawType.includes('SERIAL') || (colName.toLowerCase() === 'id' && columns.length === 0);
        const isNullable = !modifiers.includes('NOT NULL') && !isPk;
        const isUnique = modifiers.includes('UNIQUE') || isPk;
        const isFk = modifiers.includes('REFERENCES') || (colName.includes('_id') && !isPk);

        let type: ColumnType = 'VARCHAR';
        let lengthOrPrecision: string | undefined;

        const parenMatch = rawType.match(/\(([^)]+)\)/);
        if (parenMatch) {
          lengthOrPrecision = parenMatch[1];
        }

        if (rawType.includes('BIGSERIAL') || (rawType.includes('BIGINT') && modifiers.includes('IDENTITY'))) type = 'BIGSERIAL';
        else if (rawType.includes('SERIAL') || modifiers.includes('AUTO_INCREMENT')) type = 'SERIAL';
        else if (rawType.includes('BIGINT')) type = 'BIGINT';
        else if (rawType.includes('INT')) type = 'INT';
        else if (rawType.includes('UUID') || rawType.includes('UNIQUEIDENTIFIER')) type = 'UUID';
        else if (rawType.includes('BOOL') || rawType.includes('BIT')) type = 'BOOLEAN';
        else if (rawType.includes('DECIMAL') || rawType.includes('NUMERIC') || rawType.includes('NUMBER')) type = 'DECIMAL';
        else if (rawType.includes('FLOAT') || rawType.includes('DOUBLE')) type = 'FLOAT';
        else if (rawType.includes('TIMESTAMPTZ')) type = 'TIMESTAMPTZ';
        else if (rawType.includes('TIMESTAMP') || rawType.includes('DATETIME')) type = 'TIMESTAMP';
        else if (rawType.includes('DATE')) type = 'DATE';
        else if (rawType.includes('JSON')) type = 'JSONB';
        else if (rawType.includes('TEXT') || rawType.includes('CLOB')) type = 'TEXT';
        else type = 'VARCHAR';

        // Extract default value if present
        let defaultValue: string | undefined;
        const defaultMatch = modifiers.match(/DEFAULT\s+([^,]+)/i);
        if (defaultMatch) {
          defaultValue = defaultMatch[1].trim();
        }

        columns.push({
          id: `c_${tableName}_${colName}`,
          name: colName,
          type,
          lengthOrPrecision,
          isPk,
          isFk,
          isNullable,
          isUnique,
          defaultValue,
        });

        // Inline REFERENCES parsing
        if (modifiers.includes('REFERENCES')) {
          const inlineRef = item.match(/REFERENCES\s+[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s*\(([`"\[]?([a-zA-Z0-9_]+)[`"\]]?)\)/i);
          if (inlineRef) {
            const tgtTable = inlineRef[1].toLowerCase();
            const tgtCol = inlineRef[2].replace(/[`"\[\]]/g, '').toLowerCase();

            relationships.push({
              id: `rel_${tableName}_${tgtTable}_${Math.random().toString(36).substring(2, 7)}`,
              sourceTableId: tableId,
              sourceColumnId: `c_${tableName}_${colName}`,
              targetTableId: `tbl_${tgtTable}`,
              targetColumnId: `c_${tgtTable}_${tgtCol}`,
              type: '1:N',
              onDelete: 'CASCADE',
              onUpdate: 'CASCADE',
              name: `fk_${tableName}_${colName}`
            });
          }
        }
      }
    }

    // Ensure table has at least one PK if none found
    if (!columns.some((c) => c.isPk) && columns.length > 0) {
      const idCol = columns.find((c) => c.name.toLowerCase() === 'id');
      if (idCol) {
        idCol.isPk = true;
      }
    }

    tables.push({
      id: tableId,
      name: tableName,
      comment: `Таблица ${tableName} (импортирована из DDL)`,
      x: currentX,
      y: currentY,
      color: colors[colorIdx % colors.length],
      columns,
    });

    colorIdx++;
    currentX += 340;
    if (currentX > 800) {
      currentX = 80;
      currentY += 340;
    }
  }

  // Parse standalone ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY statements
  const alterFkRegex = /ALTER\s+TABLE\s+([^\s(]+)\s+ADD\s+CONSTRAINT\s+([^\s(]+)?\s*FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+([a-zA-Z\s]+))?(?:\s+ON\s+UPDATE\s+([a-zA-Z\s]+))?/gi;

  let alterMatch: RegExpExecArray | null;
  while ((alterMatch = alterFkRegex.exec(cleanSql)) !== null) {
    const srcTbl = stripQuotes(alterMatch[1]).toLowerCase();
    const constraintName = alterMatch[2] ? stripQuotes(alterMatch[2]) : `fk_${srcTbl}`;
    const srcCol = stripQuotes(alterMatch[3]).toLowerCase();
    const tgtTbl = stripQuotes(alterMatch[4]).toLowerCase();
    const tgtCol = stripQuotes(alterMatch[5]).toLowerCase();
    const onDel = (alterMatch[6]?.trim().toUpperCase() || 'CASCADE') as any;
    const onUpd = (alterMatch[7]?.trim().toUpperCase() || 'CASCADE') as any;

    const relId = `rel_${srcTbl}_${tgtTbl}_${Math.random().toString(36).substring(2, 7)}`;
    relationships.push({
      id: relId,
      sourceTableId: `tbl_${srcTbl}`,
      sourceColumnId: `c_${srcTbl}_${srcCol}`,
      targetTableId: `tbl_${tgtTbl}`,
      targetColumnId: `c_${tgtTbl}_${tgtCol}`,
      type: '1:N',
      onDelete: onDel,
      onUpdate: onUpd,
      name: constraintName
    });

    const sTable = tables.find((t) => t.id === `tbl_${srcTbl}`);
    const sCol = sTable?.columns.find((c) => c.name.toLowerCase() === srcCol);
    if (sCol) sCol.isFk = true;
  }

  return { tables, relationships };
}
