import { Column, ColumnType, Relationship, Schema, SqlDialect, Table } from '../types';
import { inferSchemaFromQueriesLocally } from './sqlQueryParser';

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
  includeSeedData?: boolean;
  seedRowCount?: number;
  includeTriggers?: boolean;
  includeRoutines?: boolean;
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

function cleanIdent(name: string): string {
  return name.replace(/^[`"\[\s]+|[`"\]\s]+$/g, '').trim();
}

function quoteIdent(name: string, dialect: SqlDialect): string {
  const clean = cleanIdent(name);
  if (dialect === 'MySQL') return `\`${clean}\``;
  if (dialect === 'MSSQL') return `[${clean}]`;
  if (dialect === 'PostgreSQL' || dialect === 'Oracle') return `"${clean}"`;
  return `"${clean}"`;
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

  // 5. Triggers (if present in schema and enabled)
  if ((options.includeTriggers ?? true) && schema.triggers && schema.triggers.length > 0) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Database Triggers (${schema.triggers.length})`);
    lines.push(`-- --------------------------------------------------------`);
    if (dialect === 'MySQL') {
      lines.push('DELIMITER //\n');
    }
    for (const trg of schema.triggers) {
      lines.push(`-- Trigger: ${trg.name} on ${trg.targetTable}`);
      lines.push(trg.definition.endsWith(';') ? trg.definition : `${trg.definition};`);
      lines.push('');
    }
    if (dialect === 'MySQL') {
      lines.push('DELIMITER ;\n');
    }
  }

  // 6. Stored Procedures and Functions (if present in schema and enabled)
  if ((options.includeRoutines ?? true) && schema.routines && schema.routines.length > 0) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Stored Procedures & Functions (${schema.routines.length})`);
    lines.push(`-- --------------------------------------------------------`);
    if (dialect === 'MySQL') {
      lines.push('DELIMITER //\n');
    }
    for (const rt of schema.routines) {
      lines.push(`-- Routine: ${rt.name} (${rt.type})`);
      lines.push(rt.definition.endsWith(';') ? rt.definition : `${rt.definition};`);
      lines.push('');
    }
    if (dialect === 'MySQL') {
      lines.push('DELIMITER ;\n');
    }
  }

  // 7. Seed / Initial Mock Data (if enabled)
  if (options.includeSeedData && targetTables.length > 0) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Initial Seed Data (${options.seedRowCount || 5} строк на таблицу)`);
    lines.push(`-- --------------------------------------------------------\n`);
    lines.push(generateSeedDataSql(schema, dialect, options.seedRowCount || 5));
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

export interface ParsedDdlResult {
  tables: Table[];
  relationships: Relationship[];
  detectedDialect?: SqlDialect;
  databaseName?: string;
  triggers?: {
    name: string;
    targetTable: string;
    timing: string;
    definition: string;
  }[];
  routines?: {
    name: string;
    type: 'PROCEDURE' | 'FUNCTION';
    definition: string;
    description?: string;
  }[];
  queries?: {
    name: string;
    sql: string;
    description?: string;
  }[];
  seedInsertsCount?: number;
  inferredFromInserts?: boolean;
}

export interface DialectDetectionResult {
  dialect: SqlDialect;
  confidence: number; // 0 - 100
  matchedTokens: string[];
  explanation: string;
}

/**
 * Detailed detection of SQL dialect with confidence estimation and token inspection
 */
export function detectSqlDialectDetailed(sql: string): DialectDetectionResult {
  if (!sql || !sql.trim()) {
    return {
      dialect: 'PostgreSQL',
      confidence: 50,
      matchedTokens: [],
      explanation: 'Стандартный ANSI SQL синтаксис (по умолчанию PostgreSQL)',
    };
  }

  const upper = sql.toUpperCase();
  const scores: Record<SqlDialect, { score: number; tokens: string[] }> = {
    MySQL: { score: 0, tokens: [] },
    PostgreSQL: { score: 0, tokens: [] },
    SQLite: { score: 0, tokens: [] },
    MSSQL: { score: 0, tokens: [] },
    Oracle: { score: 0, tokens: [] },
  };

  // 1. MySQL patterns
  if (upper.includes('AUTO_INCREMENT')) {
    scores.MySQL.score += 45;
    scores.MySQL.tokens.push('AUTO_INCREMENT');
  }
  if (upper.includes('ENGINE=') || upper.includes('ENGINE =')) {
    scores.MySQL.score += 40;
    scores.MySQL.tokens.push('ENGINE=InnoDB');
  }
  if (upper.includes('DELIMITER')) {
    scores.MySQL.score += 35;
    scores.MySQL.tokens.push('DELIMITER');
  }
  if (upper.includes('UTF8MB4') || upper.includes('COLLATE UTF8MB4')) {
    scores.MySQL.score += 30;
    scores.MySQL.tokens.push('utf8mb4');
  }
  if (/`[^`]+`/.test(sql)) {
    scores.MySQL.score += 25;
    scores.MySQL.tokens.push('Обратные кавычки (`...`)');
  }
  if (upper.includes('TINYINT(1)') || upper.includes('MEDIUMINT')) {
    scores.MySQL.score += 25;
    scores.MySQL.tokens.push('TINYINT/MEDIUMINT');
  }
  if (upper.includes('SIGNAL SQLSTATE')) {
    scores.MySQL.score += 30;
    scores.MySQL.tokens.push('SIGNAL SQLSTATE');
  }

  // 2. PostgreSQL patterns
  if (upper.includes('BIGSERIAL') || upper.includes('SERIAL')) {
    scores.PostgreSQL.score += 45;
    scores.PostgreSQL.tokens.push('SERIAL/BIGSERIAL');
  }
  if (upper.includes('TIMESTAMPTZ')) {
    scores.PostgreSQL.score += 40;
    scores.PostgreSQL.tokens.push('TIMESTAMPTZ');
  }
  if (upper.includes('JSONB')) {
    scores.PostgreSQL.score += 40;
    scores.PostgreSQL.tokens.push('JSONB');
  }
  if (upper.includes('GEN_RANDOM_UUID()') || upper.includes('UUID DEFAULT')) {
    scores.PostgreSQL.score += 35;
    scores.PostgreSQL.tokens.push('UUID gen_random_uuid');
  }
  if (upper.includes('BYTEA')) {
    scores.PostgreSQL.score += 35;
    scores.PostgreSQL.tokens.push('BYTEA');
  }
  if (upper.includes('RETURNING')) {
    scores.PostgreSQL.score += 30;
    scores.PostgreSQL.tokens.push('RETURNING');
  }
  if (/\$\$[\s\S]*?\$\$/.test(sql)) {
    scores.PostgreSQL.score += 30;
    scores.PostgreSQL.tokens.push('Dollar-quotes ($$...$$)');
  }

  // 3. SQLite patterns
  if (upper.includes('AUTOINCREMENT') && !upper.includes('AUTO_INCREMENT')) {
    scores.SQLite.score += 50;
    scores.SQLite.tokens.push('AUTOINCREMENT');
  }
  if (upper.includes('WITHOUT ROWID')) {
    scores.SQLite.score += 45;
    scores.SQLite.tokens.push('WITHOUT ROWID');
  }
  if (upper.includes('PRAGMA')) {
    scores.SQLite.score += 40;
    scores.SQLite.tokens.push('PRAGMA');
  }
  if (/INTEGER\s+PRIMARY\s+KEY/i.test(sql) && !upper.includes('AUTO_INCREMENT')) {
    scores.SQLite.score += 25;
    scores.SQLite.tokens.push('INTEGER PRIMARY KEY');
  }

  // 4. MSSQL patterns
  if (upper.includes('IDENTITY(1,1)') || upper.includes('IDENTITY(')) {
    scores.MSSQL.score += 50;
    scores.MSSQL.tokens.push('IDENTITY');
  }
  if (upper.includes('DATETIME2')) {
    scores.MSSQL.score += 40;
    scores.MSSQL.tokens.push('DATETIME2');
  }
  if (upper.includes('NVARCHAR(')) {
    scores.MSSQL.score += 35;
    scores.MSSQL.tokens.push('NVARCHAR');
  }
  if (upper.includes('GETDATE()')) {
    scores.MSSQL.score += 30;
    scores.MSSQL.tokens.push('GETDATE()');
  }
  if (/\[(?:dbo|sys|user|[\w\s]+)\]/i.test(sql)) {
    scores.MSSQL.score += 30;
    scores.MSSQL.tokens.push('Квадратные скобки ([dbo])');
  }
  if (upper.includes('CLUSTERED INDEX') || upper.includes('NONCLUSTERED')) {
    scores.MSSQL.score += 35;
    scores.MSSQL.tokens.push('CLUSTERED');
  }

  // 5. Oracle patterns
  if (upper.includes('VARCHAR2')) {
    scores.Oracle.score += 50;
    scores.Oracle.tokens.push('VARCHAR2');
  }
  if (upper.includes('NUMBER(')) {
    scores.Oracle.score += 30;
    scores.Oracle.tokens.push('NUMBER(p,s)');
  }
  if (upper.includes('SYSDATE')) {
    scores.Oracle.score += 35;
    scores.Oracle.tokens.push('SYSDATE');
  }
  if (upper.includes('CLOB') || upper.includes('BLOB')) {
    scores.Oracle.score += 25;
    scores.Oracle.tokens.push('CLOB/BLOB');
  }
  if (upper.includes('FROM DUAL')) {
    scores.Oracle.score += 35;
    scores.Oracle.tokens.push('DUAL');
  }

  // Find the highest scoring dialect
  const dialects: SqlDialect[] = ['MySQL', 'PostgreSQL', 'SQLite', 'MSSQL', 'Oracle'];
  let bestDialect: SqlDialect = 'PostgreSQL';
  let bestScore = 0;

  for (const d of dialects) {
    if (scores[d].score > bestScore) {
      bestScore = scores[d].score;
      bestDialect = d;
    }
  }

  if (bestScore === 0) {
    return {
      dialect: 'PostgreSQL',
      confidence: 65,
      matchedTokens: ['ANSI SQL DDL'],
      explanation: 'Специфичные маркеры диалекта не найдены, применен стандартный синтаксис (PostgreSQL)',
    };
  }

  const confidence = Math.min(99, Math.max(70, Math.round(50 + bestScore / 1.5)));
  const matchedTokens = scores[bestDialect].tokens;
  const explanation = `Обнаружены маркеры диалекта ${bestDialect}: ${matchedTokens.join(', ')}`;

  return {
    dialect: bestDialect,
    confidence,
    matchedTokens,
    explanation,
  };
}

/**
 * Detects SQL dialect from keywords, data types, and syntax nuances
 */
export function detectSqlDialect(sql: string): SqlDialect {
  return detectSqlDialectDetailed(sql).dialect;
}

/**
 * Parses table name specification which can be:
 * - [dbo].[Order Details]
 * - "public"."Users"
 * - `mydb`.`Покупатели`
 * - `Детали продажи`
 * - Users
 */
export function parseTableSpec(spec: string): { schemaName?: string; tableName: string } {
  const parts: string[] = [];
  const partRegex = /`([^`]+)`|"([^"]+)"|\[([^\]]+)\]|([^\s\.]+)/g;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = partRegex.exec(spec)) !== null) {
    const val = pMatch[1] || pMatch[2] || pMatch[3] || pMatch[4];
    if (val && val.trim()) {
      parts.push(val.trim());
    }
  }
  if (parts.length >= 2) {
    return {
      schemaName: parts[parts.length - 2],
      tableName: parts[parts.length - 1],
    };
  }
  return {
    tableName: parts[0] || cleanIdent(spec),
  };
}

/**
 * Safely strips SQL comments (-- and /* ... * / and #) while protecting
 * string literals ('...', "...", `...`, and dollar quotes $$...$$).
 */
export function stripSqlCommentsSafely(sql: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inDollarQuote = false;
  let dollarTag = '';
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    const prev = sql[i - 1];
    const prev2 = sql[i - 2];
    const isEscaped = prev === '\\' && prev2 !== '\\';

    // Check dollar quote in PostgreSQL $$ or $tag$
    if (!inSingleQuote && !inDoubleQuote && !inBacktick && ch === '$') {
      const rest = sql.slice(i);
      const tagMatch = rest.match(/^\$([a-zA-Z0-9_]*)\$/);
      if (tagMatch) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = tagMatch[0];
          result += dollarTag;
          i += dollarTag.length - 1;
          continue;
        } else if (rest.startsWith(dollarTag)) {
          inDollarQuote = false;
          result += dollarTag;
          i += dollarTag.length - 1;
          dollarTag = '';
          continue;
        }
      }
    }

    if (inDollarQuote) {
      result += ch;
      continue;
    }

    if (!inDoubleQuote && !inBacktick && ch === "'" && !isEscaped) {
      inSingleQuote = !inSingleQuote;
      result += ch;
      continue;
    }
    if (!inSingleQuote && !inBacktick && ch === '"' && !isEscaped) {
      inDoubleQuote = !inDoubleQuote;
      result += ch;
      continue;
    }
    if (!inSingleQuote && !inDoubleQuote && ch === '`' && !isEscaped) {
      inBacktick = !inBacktick;
      result += ch;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      // Single-line comment -- or #
      if ((ch === '-' && next === '-') || ch === '#') {
        let eol = sql.indexOf('\n', i);
        if (eol === -1) eol = sql.length;
        i = eol - 1;
        result += '\n';
        continue;
      }
      // Multi-line comment /* ... */
      if (ch === '/' && next === '*') {
        const endC = sql.indexOf('*/', i + 2);
        if (endC === -1) {
          i = sql.length;
        } else {
          i = endC + 1;
        }
        result += ' ';
        continue;
      }
    }

    result += ch;
  }
  return result;
}

// Robust, multi-line and Unicode-aware AST parser for raw SQL DDL
export function parseSqlDdl(sql: string): ParsedDdlResult {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  const detectedDialect = detectSqlDialect(sql);

  // Clean initial encodings, BOM and non-breaking spaces
  let normalizedSql = sql
    .replace(/^\uFEFF/, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Detect database name from CREATE DATABASE or USE statements
  let databaseName: string | undefined;
  const dbMatch =
    normalizedSql.match(/CREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?\s+([^\s;]+)/i) ||
    normalizedSql.match(/USE\s+([^\s;]+)/i);
  if (dbMatch) {
    databaseName = cleanIdent(dbMatch[1]);
  }

  // Extract Triggers (supports Cyrillic and Kazakh table and trigger names)
  const triggers: { name: string; targetTable: string; timing: string; definition: string }[] = [];
  const triggerRegex =
    /CREATE\s+TRIGGER\s+([^\s]+)\s+((?:BEFORE|AFTER)\s+(?:INSERT|UPDATE|DELETE)\s+ON\s+([^\s]+)[\s\S]*?)(?:END(?:\/{2}|;|\$|\s)|\/\/\s*|DELIMITER)/gi;
  let trgMatch: RegExpExecArray | null;
  while ((trgMatch = triggerRegex.exec(normalizedSql)) !== null) {
    triggers.push({
      name: cleanIdent(trgMatch[1]),
      targetTable: cleanIdent(trgMatch[3]),
      timing: trgMatch[2].split(/FOR\s+EACH/i)[0].trim(),
      definition: trgMatch[0].trim(),
    });
  }

  // Extract Stored Procedures and Functions
  const routines: { name: string; type: 'PROCEDURE' | 'FUNCTION'; definition: string; description?: string }[] = [];
  const procRegex =
    /CREATE\s+(PROCEDURE|FUNCTION)\s+([^\s\(]+)\s*\(([\s\S]*?)\)[\s\S]*?(?:END(?:\/{2}|;|\$|\s)|\/\/\s*|DELIMITER)/gi;
  let procMatch: RegExpExecArray | null;
  while ((procMatch = procRegex.exec(normalizedSql)) !== null) {
    routines.push({
      name: cleanIdent(procMatch[2]),
      type: procMatch[1].toUpperCase() as 'PROCEDURE' | 'FUNCTION',
      definition: procMatch[0].trim(),
      description: `Параметры: (${procMatch[3].replace(/\s+/g, ' ').trim()})`,
    });
  }

  // Extract Views and Analytical queries
  const queries: { name: string; sql: string; description?: string }[] = [];

  // 1. Explicit CREATE VIEW statements
  const viewRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+([^\s]+)\s+AS\s+([\s\S]*?);/gi;
  let vMatch: RegExpExecArray | null;
  while ((vMatch = viewRegex.exec(normalizedSql)) !== null) {
    const viewName = cleanIdent(vMatch[1]);
    const viewSql = vMatch[2].trim();
    queries.push({
      name: `Представление: ${viewName}`,
      sql: viewSql,
      description: `CREATE VIEW \`${viewName}\``,
    });
  }

  // 2. Explicit SELECT statements
  const selectRegex = /(--[^\n]*\n)?(SELECT\s+[\s\S]*?;)/gi;
  let qMatch: RegExpExecArray | null;
  let qIndex = 1;
  while ((qMatch = selectRegex.exec(normalizedSql)) !== null) {
    const rawComment = (qMatch[1] || '').replace(/^--\s*/, '').trim();
    const querySql = qMatch[2].trim();
    if (!queries.some((q) => q.sql.includes(querySql))) {
      queries.push({
        name: rawComment || `Аналитический запрос ${qIndex++}`,
        sql: querySql,
        description: rawComment || undefined,
      });
    }
  }

  // Count Seed INSERT statements
  const insertMatches = normalizedSql.match(/INSERT\s+INTO\s+/gi);
  const seedInsertsCount = insertMatches ? insertMatches.length : 0;

  // Extract comments above CREATE TABLE to use as table descriptions
  const tablePreComments: Record<string, string> = {};
  const preCommentRegex =
    /((?:(?:--|#)[^\n]*\n)+)\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:(?:GLOBAL|LOCAL)\s+)?(?:TEMPORARY\s+|TEMP\s+|UNLOGGED\s+|CACHED\s+|MEMORY\s+)?TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([^\(\);]+?)(?:\s*\(|\s+AS\b)/gi;
  let pcMatch: RegExpExecArray | null;
  while ((pcMatch = preCommentRegex.exec(normalizedSql)) !== null) {
    const commentsBlock = pcMatch[1]
      .split('\n')
      .map((line) => line.replace(/^(?:--|#)\s*/, '').trim())
      .filter(
        (line) =>
          line &&
          !line.toUpperCase().startsWith('STREAMING_CHUNK') &&
          !line.startsWith('1.') &&
          !line.startsWith('2.') &&
          !line.startsWith('3.') &&
          !line.startsWith('4.')
      )
      .join('; ');
    const tbl = parseTableSpec(pcMatch[2]).tableName.toLowerCase();
    if (tbl && commentsBlock) {
      tablePreComments[tbl] = commentsBlock;
    }
  }

  // Normalize and clean SQL for DDL parsing:
  // 1. Remove MySQL DELIMITER commands and replace custom delimiters (//, $$, etc.)
  let cleanSql = normalizedSql
    .replace(/^[ \t]*DELIMITER\s+[^\n]+/gim, '\n')
    .replace(/(\bEND|\)|[A-Za-z0-9_\]"`'])\s*(\/{2}|\${2})/gi, '$1;')
    .replace(/\s*(\/{2}|\${2})\s*$/gm, ';');

  // 2. Strip comments safely with string literal and dollar quote awareness
  cleanSql = stripSqlCommentsSafely(cleanSql).trim();

  // Universal CREATE TABLE regex supporting all quoting styles, namespaces, and table variants
  const createTableStartRegex =
    /CREATE\s+(?:OR\s+REPLACE\s+)?(?:(?:GLOBAL|LOCAL)\s+)?(?:TEMPORARY\s+|TEMP\s+|UNLOGGED\s+|CACHED\s+|MEMORY\s+)?TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([^\(\);]+?)(?:\s*\(|\s+AS\b)/gi;

  let match: RegExpExecArray | null;
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];
  let colorIdx = 0;
  let currentX = 80;
  let currentY = 80;

  while ((match = createTableStartRegex.exec(cleanSql)) !== null) {
    const fullMatch = match[0];
    const tableSpec = parseTableSpec(match[1]);
    const rawTableName = tableSpec.tableName;
    const safeTableKey = rawTableName.toLowerCase().replace(/\s+/g, '_');
    const tableId = `tbl_${safeTableKey}`;
    const startIndex = match.index + fullMatch.length;

    // Scan for closing parenthesis of the table definition respecting nested parens and strings
    let depth = 1;
    let endIndex = -1;
    let inString = false;
    let stringChar = '';

    for (let i = startIndex; i < cleanSql.length; i++) {
      const ch = cleanSql[i];
      const isEscaped = cleanSql[i - 1] === '\\' && cleanSql[i - 2] !== '\\';
      if ((ch === "'" || ch === '"' || ch === '`') && !isEscaped) {
        if (!inString) {
          inString = true;
          stringChar = ch;
        } else if (stringChar === ch) {
          inString = false;
        }
        continue;
      }
      if (inString) continue;

      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex === -1) {
      // Fallback: look for closing paren before next CREATE TABLE or EOF
      const nextCreate = cleanSql.slice(startIndex).search(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMPORARY\s+|TEMP\s+|UNLOGGED\s+)?TABLE/i);
      const searchWindow = nextCreate > 0 ? cleanSql.substring(startIndex, startIndex + nextCreate) : cleanSql.substring(startIndex);
      const lastParen = searchWindow.lastIndexOf(')');
      if (lastParen !== -1) {
        endIndex = startIndex + lastParen;
      } else {
        continue;
      }
    }

    const tableBody = cleanSql.substring(startIndex, endIndex);
    createTableStartRegex.lastIndex = endIndex + 1;

    const columns: Column[] = [];

    // Split body into comma-separated items at top depth (parenDepth === 0)
    const rawTokens: string[] = [];
    let currentToken = '';
    let parenDepth = 0;
    let inStr = false;
    let strCh = '';

    for (let i = 0; i < tableBody.length; i++) {
      const char = tableBody[i];
      if ((char === "'" || char === '"') && tableBody[i - 1] !== '\\') {
        if (!inStr) {
          inStr = true;
          strCh = char;
        } else if (strCh === char) {
          inStr = false;
        }
      }

      if (!inStr) {
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;
      }

      if (char === ',' && parenDepth === 0 && !inStr) {
        if (currentToken.trim()) rawTokens.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    if (currentToken.trim()) rawTokens.push(currentToken.trim());

    // Process each token (column or constraint)
    for (const rawItem of rawTokens) {
      const item = rawItem.trim();
      if (!item) continue;

      // Table-level PRIMARY KEY constraint: [CONSTRAINT name] PRIMARY KEY (col1, col2)
      if (/^(?:CONSTRAINT\s+[^\s]+\s+)?PRIMARY\s+KEY/i.test(item)) {
        const pkMatch = item.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const pkCols = pkMatch[1].split(',').map((c) => cleanIdent(c).toLowerCase());
          for (const pkCol of pkCols) {
            const found = columns.find((c) => c.name.toLowerCase() === pkCol);
            if (found) found.isPk = true;
          }
        }
        continue;
      }

      // Table-level FOREIGN KEY constraint:
      // [CONSTRAINT `name`] FOREIGN KEY (`col`) REFERENCES `target_table` (`target_col`) [ON DELETE ...] [ON UPDATE ...]
      if (/(?:CONSTRAINT\s+([^\s]+)\s+)?FOREIGN\s+KEY/i.test(item) || /FOREIGN\s+KEY\s*\(/i.test(item)) {
        const fkMatch = item.match(
          /(?:CONSTRAINT\s+([^\s]+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+((?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+))*)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?/i
        );
        if (fkMatch) {
          const colName = cleanIdent(fkMatch[2].split(',')[0]);
          const targetSpec = parseTableSpec(fkMatch[3]);
          const targetTable = targetSpec.tableName;
          const targetCol = cleanIdent(fkMatch[4].split(',')[0]);
          const constraintName = cleanIdent(fkMatch[1] || `fk_${safeTableKey}_${colName.toLowerCase().replace(/\s+/g, '_')}`);
          const onDel = (fkMatch[5]?.toUpperCase().replace(/\s+/g, ' ') || 'CASCADE') as any;
          const onUpd = (fkMatch[6]?.toUpperCase().replace(/\s+/g, ' ') || 'CASCADE') as any;

          const tgtTableKey = targetTable.toLowerCase().replace(/\s+/g, '_');
          const tgtColKey = targetCol.toLowerCase().replace(/\s+/g, '_');

          relationships.push({
            id: `rel_${safeTableKey}_${tgtTableKey}_${Math.random().toString(36).substring(2, 7)}`,
            sourceTableId: tableId,
            sourceColumnId: `c_${safeTableKey}_${colName.toLowerCase().replace(/\s+/g, '_')}`,
            targetTableId: `tbl_${tgtTableKey}`,
            targetColumnId: `c_${tgtTableKey}_${tgtColKey}`,
            type: '1:N',
            onDelete: onDel,
            onUpdate: onUpd,
            name: constraintName,
          });

          const foundCol = columns.find((c) => c.name.toLowerCase() === colName.toLowerCase());
          if (foundCol) foundCol.isFk = true;
        }
        continue;
      }

      // Table-level UNIQUE constraint
      if (/^(?:CONSTRAINT\s+[^\s]+\s+)?UNIQUE(?:\s+KEY|\s+INDEX)?\s*\(/i.test(item)) {
        const uMatch = item.match(/UNIQUE(?:\s+KEY|\s+INDEX)?\s*\(([^)]+)\)/i);
        if (uMatch) {
          const uCols = uMatch[1].split(',').map((c) => cleanIdent(c).toLowerCase());
          for (const uCol of uCols) {
            const found = columns.find((c) => c.name.toLowerCase() === uCol);
            if (found) found.isUnique = true;
          }
        }
        continue;
      }

      // Ignore table-level CHECK, KEY, INDEX, FULLTEXT, SPATIAL (so they don't produce phantom columns)
      if (/^(?:CONSTRAINT\s+[^\s]+\s+)?(?:CHECK|KEY|INDEX|FULLTEXT|SPATIAL)\b/i.test(item)) {
        continue;
      }

      // Column Definition
      let colName = '';
      let modifiers = '';

      const qMatch = item.match(/^(`([^`]+)`|"([^"]+)"|\[([^\]]+)\])\s+([\s\S]*)$/);
      if (qMatch) {
        colName = (qMatch[2] || qMatch[3] || qMatch[4]).trim();
        modifiers = (qMatch[5] || '').trim();
      } else {
        const uMatch = item.match(/^([^\s]+)\s+([\s\S]*)$/);
        if (uMatch) {
          colName = cleanIdent(uMatch[1]);
          modifiers = (uMatch[2] || '').trim();
        }
      }

      if (colName) {
        // Strip inline CHECK (...) so it doesn't corrupt DEFAULT value
        modifiers = modifiers.replace(/CHECK\s*\([\s\S]*?\)/gi, '').trim();

        // Extract raw type
        const typeMatch = modifiers.match(
          /^([A-Za-z0-9_]+(?:\s*\([^)]+\))?(?:\s+(?:VARYING|PRECISION|ZONE|TIME\s+ZONE|WITHOUT\s+TIME\s+ZONE|WITH\s+TIME\s+ZONE|UNSIGNED))?)([\s\S]*)$/i
        );
        let rawType = 'VARCHAR';
        let restModifiers = modifiers;
        if (typeMatch) {
          rawType = typeMatch[1].trim().toUpperCase();
          restModifiers = (typeMatch[2] || '').trim();
        }

        const isPk =
          /PRIMARY\s+KEY/i.test(restModifiers) ||
          /PRIMARY\s+KEY/i.test(rawType) ||
          rawType.includes('SERIAL') ||
          /AUTO_INCREMENT/i.test(restModifiers) ||
          /IDENTITY/i.test(restModifiers) ||
          (colName.toLowerCase() === 'id' && columns.length === 0);
        const isNullable = !/NOT\s+NULL/i.test(restModifiers) && !isPk;
        const isUnique = /UNIQUE/i.test(restModifiers) || isPk;
        const isFk = /REFERENCES/i.test(restModifiers) || (colName.toLowerCase().endsWith('_id') && !isPk);

        let type: ColumnType = 'VARCHAR';
        let lengthOrPrecision: string | undefined;

        const parenMatch = rawType.match(/\(([^)]+)\)/);
        if (parenMatch) {
          lengthOrPrecision = parenMatch[1];
        }

        if (rawType.includes('BIGSERIAL') || (rawType.includes('BIGINT') && /IDENTITY/i.test(restModifiers))) type = 'BIGSERIAL';
        else if (rawType.includes('SERIAL') || /AUTO_INCREMENT/i.test(restModifiers)) type = 'SERIAL';
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

        // Extract DEFAULT value if present
        let defaultValue: string | undefined;
        const defaultMatch = restModifiers.match(/DEFAULT\s+('([^']*)'|"([^"]*)"|\([^)]+\)|[^\s,;]+)/i);
        if (defaultMatch) {
          defaultValue = defaultMatch[1].trim();
        }

        // Extract COMMENT if present
        let colComment: string | undefined;
        const commentMatch = restModifiers.match(/COMMENT\s+'([^']+)'/i);
        if (commentMatch) {
          colComment = commentMatch[1];
        }

        const safeColKey = colName.toLowerCase().replace(/\s+/g, '_');
        columns.push({
          id: `c_${safeTableKey}_${safeColKey}`,
          name: colName,
          type,
          lengthOrPrecision,
          isPk,
          isFk,
          isNullable,
          isUnique,
          defaultValue,
          comment: colComment,
        });

        // Inline REFERENCES parsing
        if (/REFERENCES/i.test(restModifiers)) {
          const inlineRef = restModifiers.match(
            /REFERENCES\s+((?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+))*)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?/i
          );
          if (inlineRef) {
            const targetSpec = parseTableSpec(inlineRef[1]);
            const tgtTable = targetSpec.tableName;
            const tgtCol = cleanIdent(inlineRef[2].split(',')[0]);
            const onDel = (inlineRef[3]?.toUpperCase().replace(/\s+/g, ' ') || 'CASCADE') as any;
            const onUpd = (inlineRef[4]?.toUpperCase().replace(/\s+/g, ' ') || 'CASCADE') as any;

            const tgtTableKey = tgtTable.toLowerCase().replace(/\s+/g, '_');
            const tgtColKey = tgtCol.toLowerCase().replace(/\s+/g, '_');

            relationships.push({
              id: `rel_${safeTableKey}_${tgtTableKey}_${Math.random().toString(36).substring(2, 7)}`,
              sourceTableId: tableId,
              sourceColumnId: `c_${safeTableKey}_${safeColKey}`,
              targetTableId: `tbl_${tgtTableKey}`,
              targetColumnId: `c_${tgtTableKey}_${tgtColKey}`,
              type: '1:N',
              onDelete: onDel,
              onUpdate: onUpd,
              name: `fk_${safeTableKey}_${safeColKey}`,
            });
          }
        }
      }
    }

    // Ensure table has at least one PK if none found
    if (!columns.some((c) => c.isPk) && columns.length > 0) {
      const idCol = columns.find(
        (c) =>
          c.name.toLowerCase() === 'id' ||
          c.name.toLowerCase().endsWith('_id') ||
          c.name.toLowerCase().startsWith('id_')
      );
      if (idCol) {
        idCol.isPk = true;
      }
    }

    const preComment = tablePreComments[rawTableName.toLowerCase()];
    tables.push({
      id: tableId,
      name: rawTableName,
      comment: preComment || `Таблица ${rawTableName} (импортирована из DDL)`,
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

  // Parse standalone ALTER TABLE ... ADD [CONSTRAINT] ... FOREIGN KEY statements
  const alterFkRegex =
    /ALTER\s+TABLE\s+((?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+))*)\s+ADD\s+(?:CONSTRAINT\s+([^\s]+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+((?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+))*)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?/gi;

  let alterMatch: RegExpExecArray | null;
  while ((alterMatch = alterFkRegex.exec(cleanSql)) !== null) {
    const srcSpec = parseTableSpec(alterMatch[1]);
    const srcTbl = srcSpec.tableName;
    const srcTblKey = srcTbl.toLowerCase().replace(/\s+/g, '_');
    const srcCol = cleanIdent(alterMatch[3].split(',')[0]);
    const srcColKey = srcCol.toLowerCase().replace(/\s+/g, '_');

    const tgtSpec = parseTableSpec(alterMatch[4]);
    const tgtTbl = tgtSpec.tableName;
    const tgtTblKey = tgtTbl.toLowerCase().replace(/\s+/g, '_');
    const tgtCol = cleanIdent(alterMatch[5].split(',')[0]);
    const tgtColKey = tgtCol.toLowerCase().replace(/\s+/g, '_');

    const constraintName = alterMatch[2] ? cleanIdent(alterMatch[2]) : `fk_${srcTblKey}_${srcColKey}`;
    const onDel = (alterMatch[6]?.trim().toUpperCase().replace(/\s+/g, ' ') || 'CASCADE') as any;
    const onUpd = (alterMatch[7]?.trim().toUpperCase().replace(/\s+/g, ' ') || 'CASCADE') as any;

    const relId = `rel_${srcTblKey}_${tgtTblKey}_${Math.random().toString(36).substring(2, 7)}`;
    relationships.push({
      id: relId,
      sourceTableId: `tbl_${srcTblKey}`,
      sourceColumnId: `c_${srcTblKey}_${srcColKey}`,
      targetTableId: `tbl_${tgtTblKey}`,
      targetColumnId: `c_${tgtTblKey}_${tgtColKey}`,
      type: '1:N',
      onDelete: onDel,
      onUpdate: onUpd,
      name: constraintName,
    });

    const sTable = tables.find((t) => t.id === `tbl_${srcTblKey}`);
    const sCol = sTable?.columns.find((c) => c.name.toLowerCase() === srcCol.toLowerCase());
    if (sCol) sCol.isFk = true;
  }

  // Parse standalone ALTER TABLE ... ADD [CONSTRAINT] ... PRIMARY KEY statements (common in MySQL/phpMyAdmin dumps)
  const alterPkRegex =
    /ALTER\s+TABLE\s+((?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+))*)\s+ADD\s+(?:CONSTRAINT\s+([^\s]+)\s+)?PRIMARY\s+KEY(?:\s+CLUSTERED)?\s*\(([^)]+)\)/gi;
  let apkMatch: RegExpExecArray | null;
  while ((apkMatch = alterPkRegex.exec(cleanSql)) !== null) {
    const tblSpec = parseTableSpec(apkMatch[1]);
    const tblId = `tbl_${tblSpec.tableName.toLowerCase().replace(/\s+/g, '_')}`;
    const targetTable = tables.find((t) => t.id === tblId);
    if (targetTable) {
      const pkColNames = apkMatch[3].split(',').map((c) => cleanIdent(c).toLowerCase());
      for (const pkCol of pkColNames) {
        const found = targetTable.columns.find((c) => c.name.toLowerCase() === pkCol);
        if (found) found.isPk = true;
      }
    }
  }

  // Fallback 1: If no CREATE TABLE found, check for INSERT INTO statements to reconstruct schema
  let inferredFromInserts = false;
  if (tables.length === 0) {
    const insertTableRegex = /INSERT\s+INTO\s+([^\s\(]+(?:\s*\.[^\s\(]+)?)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi;
    let insMatch: RegExpExecArray | null;
    const inferredTables: Record<string, { colNames: string[]; sampleValues: string[] }> = {};

    while ((insMatch = insertTableRegex.exec(cleanSql)) !== null) {
      const tblName = parseTableSpec(insMatch[1]).tableName;
      if (!inferredTables[tblName]) {
        const colNames = insMatch[2].split(',').map((c) => cleanIdent(c));
        const sampleValues = insMatch[3].split(',').map((v) => v.trim());
        inferredTables[tblName] = { colNames, sampleValues };
      }
    }

    const inferredKeys = Object.keys(inferredTables);
    if (inferredKeys.length > 0) {
      inferredFromInserts = true;
      let curX = 80;
      let curY = 80;
      let colorIdx = 0;

      for (const tblName of inferredKeys) {
        const { colNames, sampleValues } = inferredTables[tblName];
        const safeTbl = tblName.toLowerCase().replace(/\s+/g, '_');
        const tblId = `tbl_${safeTbl}`;

        const cols: Column[] = colNames.map((name, idx) => {
          const val = sampleValues[idx] || '';
          let type: ColumnType = 'VARCHAR';
          if (/^\d+$/.test(val)) type = 'INT';
          else if (/^\d+\.\d+$/.test(val)) type = 'DECIMAL';
          else if (/^(?:true|false|1|0)$/i.test(val)) type = 'BOOLEAN';
          else if (/^'\d{4}-\d{2}-\d{2}'$/.test(val)) type = 'DATE';
          else if (/^'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'$/.test(val)) type = 'TIMESTAMP';

          const isPk =
            idx === 0 ||
            name.toLowerCase() === 'id' ||
            name.toLowerCase().startsWith('id_') ||
            name.toLowerCase().endsWith('_id');
          return {
            id: `c_${safeTbl}_${name.toLowerCase().replace(/\s+/g, '_')}`,
            name,
            type,
            isPk,
            isFk: !isPk && (name.toLowerCase().endsWith('_id') || name.toLowerCase().startsWith('id_')),
            isNullable: !isPk,
            isUnique: isPk,
          };
        });

        tables.push({
          id: tblId,
          name: tblName,
          comment: `Таблица ${tblName} (восстановлена из данных INSERT INTO)`,
          x: curX,
          y: curY,
          color: colors[colorIdx % colors.length],
          columns: cols,
        });

        colorIdx++;
        curX += 340;
        if (curX > 800) {
          curX = 80;
          curY += 340;
        }
      }
    }
  }

  // Fallback 2: If still no tables found, attempt query-based schema reconstruction (from SELECT queries)
  if (tables.length === 0) {
    try {
      const fallbackInferred = inferSchemaFromQueriesLocally(sql);
      if (fallbackInferred && fallbackInferred.tables && fallbackInferred.tables.length > 0) {
        return {
          tables: fallbackInferred.tables,
          relationships: fallbackInferred.relationships || [],
          detectedDialect,
          databaseName,
          triggers: triggers.length > 0 ? triggers : undefined,
          routines: routines.length > 0 ? routines : undefined,
          queries: queries.length > 0 ? queries : undefined,
          seedInsertsCount,
          inferredFromInserts: false,
        };
      }
    } catch {
      // Ignore fallback error and return standard result
    }
  }

  return {
    tables,
    relationships,
    detectedDialect,
    databaseName,
    triggers: triggers.length > 0 ? triggers : undefined,
    routines: routines.length > 0 ? routines : undefined,
    queries: queries.length > 0 ? queries : undefined,
    seedInsertsCount,
    inferredFromInserts,
  };
}
