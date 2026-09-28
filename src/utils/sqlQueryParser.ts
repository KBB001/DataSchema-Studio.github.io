import { Column, ColumnType, Relationship, Table } from '../types';

export interface InferredSchemaResult {
  tables: Table[];
  relationships: Relationship[];
  inferredSource: string;
}

export function normalizeColumnType(rawType?: string): ColumnType {
  const upper = (rawType || '').toUpperCase().trim();
  if (upper.includes('BIGSERIAL')) return 'BIGSERIAL';
  if (upper.includes('SERIAL')) return 'SERIAL';
  if (upper.includes('BIGINT') || upper.includes('INT8')) return 'BIGINT';
  if (upper.includes('INT')) return 'INT';
  if (upper.includes('CHAR') || upper.includes('STRING')) return 'VARCHAR';
  if (upper.includes('TEXT')) return 'TEXT';
  if (upper.includes('UUID')) return 'UUID';
  if (upper.includes('BOOL')) return 'BOOLEAN';
  if (upper.includes('DECIMAL') || upper.includes('NUMERIC')) return 'DECIMAL';
  if (upper.includes('FLOAT') || upper.includes('DOUBLE') || upper.includes('REAL')) return 'FLOAT';
  if (upper.includes('TIMESTAMPTZ')) return 'TIMESTAMPTZ';
  if (upper.includes('TIME')) return 'TIMESTAMP';
  if (upper.includes('DATE')) return 'DATE';
  if (upper.includes('JSON')) return 'JSONB';
  if (upper.includes('ENUM')) return 'ENUM';
  return 'VARCHAR';
}

export function inferSchemaFromQueriesLocally(sql: string): InferredSchemaResult {
  const tableMap = new Map<string, { columns: Map<string, Column>; alias?: string; comment?: string }>();
  const relationships: Relationship[] = [];

  const cleanSql = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // 1. Try to parse CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*\(([\s\S]*?)\);/gi;
  let ddlMatch: RegExpExecArray | null;

  while ((ddlMatch = createTableRegex.exec(cleanSql)) !== null) {
    const rawTableName = ddlMatch[1];
    const tableBody = ddlMatch[2];
    const tableName = rawTableName.toLowerCase();

    if (!tableMap.has(tableName)) {
      tableMap.set(tableName, {
        columns: new Map(),
        comment: `Таблица ${tableName} (импортирована из DDL)`,
      });
    }

    const colMap = tableMap.get(tableName)!.columns;
    const lines = tableBody.split('\n').map((l) => l.trim().replace(/,$/, '')).filter(Boolean);

    for (const line of lines) {
      if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|KEY|INDEX)/i.test(line)) {
        const fkMatch = line.match(/FOREIGN\s+KEY\s*\([`"']?([a-zA-Z0-9_]+)[`"']?\)\s*REFERENCES\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*\([`"']?([a-zA-Z0-9_]+)[`"']?\)/i);
        if (fkMatch) {
          const colName = fkMatch[1].toLowerCase();
          const targetTable = fkMatch[2].toLowerCase();
          const targetCol = fkMatch[3].toLowerCase();

          relationships.push({
            id: `rel_${tableName}_${targetTable}_${Math.random().toString(36).substring(2, 6)}`,
            sourceTableId: `tbl_${tableName}`,
            sourceColumnId: `c_${tableName}_${colName}`,
            targetTableId: `tbl_${targetTable}`,
            targetColumnId: `c_${targetTable}_${targetCol}`,
            type: '1:N',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          });
        }
        continue;
      }

      const colTokens = line.split(/\s+/);
      if (colTokens.length < 2) continue;

      const colName = colTokens[0].replace(/[`"']/g, '').toLowerCase();
      const colType = colTokens[1].toUpperCase().replace(/\(.*\)/, '');
      const isPk = /PRIMARY\s+KEY/i.test(line) || colName === 'id';
      const isNullable = !/NOT\s+NULL/i.test(line) && !isPk;
      const isUnique = /UNIQUE/i.test(line) || isPk;
      const isFk = /REFERENCES/i.test(line) || (colName.includes('_id') && !isPk);

      const inlineFkMatch = line.match(/REFERENCES\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*(?:\([`"']?([a-zA-Z0-9_]+)[`"']?\))?/i);
      if (inlineFkMatch) {
        const targetTable = inlineFkMatch[1].toLowerCase();
        const targetCol = (inlineFkMatch[2] || 'id').toLowerCase();
        relationships.push({
          id: `rel_${tableName}_${targetTable}_${Math.random().toString(36).substring(2, 6)}`,
          sourceTableId: `tbl_${tableName}`,
          sourceColumnId: `c_${tableName}_${colName}`,
          targetTableId: `tbl_${targetTable}`,
          targetColumnId: `c_${targetTable}_${targetCol}`,
          type: '1:N',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        });
      }

      colMap.set(colName, {
        id: `c_${tableName}_${colName}`,
        name: colName,
        type: normalizeColumnType(colType),
        isPk,
        isFk,
        isNullable,
        isUnique,
      });
    }
  }

  // 2. Identify FROM and JOIN tables with aliases if no DDL found
  if (tableMap.size === 0) {
    const fromJoinRegex = /(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi;
    let match: RegExpExecArray | null;
    const aliasToTable = new Map<string, string>();

    while ((match = fromJoinRegex.exec(cleanSql)) !== null) {
      const rawTableName = match[1];
      const alias = match[2];

      const tableName = rawTableName.toLowerCase();
      if (!['where', 'group', 'order', 'having', 'limit', 'on', 'left', 'right', 'inner', 'outer'].includes(tableName)) {
        if (!tableMap.has(tableName)) {
          tableMap.set(tableName, { columns: new Map() });
        }

        if (alias) {
          aliasToTable.set(alias.toLowerCase(), tableName);
        }
        aliasToTable.set(tableName, tableName);
      }
    }

    // Identify JOIN conditions: ON a.col1 = b.col2 or ON a.id = b.user_id
    const joinOnRegex = /ON\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/gi;
    let joinMatch: RegExpExecArray | null;

    while ((joinMatch = joinOnRegex.exec(cleanSql)) !== null) {
      const leftAlias = joinMatch[1].toLowerCase();
      const leftCol = joinMatch[2].toLowerCase();
      const rightAlias = joinMatch[3].toLowerCase();
      const rightCol = joinMatch[4].toLowerCase();

      const leftTable = aliasToTable.get(leftAlias) || leftAlias;
      const rightTable = aliasToTable.get(rightAlias) || rightAlias;

      if (leftTable && rightTable && leftTable !== rightTable) {
        let srcT = leftTable;
        let srcC = leftCol;
        let tgtT = rightTable;
        let tgtC = rightCol;

        if (leftCol === 'id' || rightCol.includes('_id')) {
          srcT = rightTable;
          srcC = rightCol;
          tgtT = leftTable;
          tgtC = leftCol;
        }

        relationships.push({
          id: `rel_inferred_${srcT}_${tgtT}_${Math.random().toString(36).substring(2, 6)}`,
          sourceTableId: `tbl_${srcT}`,
          sourceColumnId: `c_${srcT}_${srcC}`,
          targetTableId: `tbl_${tgtT}`,
          targetColumnId: `c_${tgtT}_${tgtC}`,
          type: '1:N',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        });

        if (tableMap.has(srcT)) {
          tableMap.get(srcT)!.columns.set(srcC, {
            id: `c_${srcT}_${srcC}`,
            name: srcC,
            type: 'BIGINT',
            isPk: false,
            isFk: true,
            isNullable: false,
            isUnique: false,
          });
        }
        if (tableMap.has(tgtT)) {
          tableMap.get(tgtT)!.columns.set(tgtC, {
            id: `c_${tgtT}_${tgtC}`,
            name: tgtC,
            type: 'BIGSERIAL',
            isPk: true,
            isFk: false,
            isNullable: false,
            isUnique: true,
          });
        }
      }
    }

    // Extract columns from SELECT
    const selectMatch = cleanSql.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
    if (selectMatch) {
      const selectBody = selectMatch[1];
      const items = selectBody.split(',');
      for (const item of items) {
        const colWithTable = item.trim().match(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
        if (colWithTable) {
          const alias = colWithTable[1].toLowerCase();
          const colName = colWithTable[2].toLowerCase();
          const realTable = aliasToTable.get(alias);

          if (realTable && tableMap.has(realTable)) {
            const colData = tableMap.get(realTable)!.columns;
            if (!colData.has(colName)) {
              const isId = colName === 'id';
              colData.set(colName, {
                id: `c_${realTable}_${colName}`,
                name: colName,
                type: isId
                  ? 'BIGSERIAL'
                  : colName.includes('time') || colName.includes('date') || colName.includes('at')
                  ? 'TIMESTAMPTZ'
                  : colName.includes('amount') || colName.includes('price')
                  ? 'DECIMAL'
                  : 'VARCHAR',
                isPk: isId,
                isFk: colName.includes('_id') && !isId,
                isNullable: !isId,
                isUnique: isId,
              });
            }
          }
        }
      }
    }
  }

  // Build final tables list
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
  let colorIdx = 0;
  let curX = 80;
  let curY = 80;

  const resultTables: Table[] = [];

  for (const [tName, tData] of tableMap.entries()) {
    let columns = Array.from(tData.columns.values());

    if (!columns.some((c) => c.isPk)) {
      columns.unshift({
        id: `c_${tName}_id`,
        name: 'id',
        type: 'BIGSERIAL',
        isPk: true,
        isFk: false,
        isNullable: false,
        isUnique: true,
      });
    }

    resultTables.push({
      id: `tbl_${tName}`,
      name: tName,
      comment: tData.comment || `Сгенерировано автоматически из SQL-запроса (${tName})`,
      x: curX,
      y: curY,
      color: colors[colorIdx % colors.length],
      columns,
    });

    colorIdx++;
    curX += 360;
    if (curX > 800) {
      curX = 80;
      curY += 300;
    }
  }

  return {
    tables: resultTables,
    relationships,
    inferredSource: 'Локальный AST парсер запросов',
  };
}

export async function generateSchemaFromSql(sqlQueries: string): Promise<InferredSchemaResult> {
  try {
    const res = await fetch('/api/gemini/generate-schema-from-sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sqlQueries }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.tables && Array.isArray(data.tables) && data.tables.length > 0) {
        let curX = 80;
        let curY = 80;
        const formattedTables: Table[] = data.tables.map((t: any, idx: number) => {
          const rawId = t.id || t.name;
          const tableId = rawId.startsWith('tbl_') ? rawId : `tbl_${rawId.toLowerCase()}`;
          const table: Table = {
            id: tableId,
            name: t.name,
            comment: t.comment || 'Сгенерировано из SQL запроса',
            x: t.x || curX,
            y: t.y || curY,
            color: t.color || ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'][idx % 5],
            columns: (t.columns || []).map((c: any) => ({
              id: c.id || `c_${t.name.toLowerCase()}_${c.name.toLowerCase()}`,
              name: c.name,
              type: normalizeColumnType(c.type),
              isPk: Boolean(c.isPk),
              isFk: Boolean(c.isFk),
              isNullable: Boolean(c.isNullable),
              isUnique: Boolean(c.isUnique),
              defaultValue: c.defaultValue,
            })),
          };
          curX += 360;
          if (curX > 850) {
            curX = 80;
            curY += 300;
          }
          return table;
        });

        // Resolve table & column mapping for relationships
        const findTableId = (nameOrId: string) => {
          const lower = (nameOrId || '').toLowerCase().replace(/^tbl_/, '').replace(/^table_/, '');
          const match = formattedTables.find(
            (t) =>
              t.name.toLowerCase() === lower ||
              t.id.toLowerCase() === `tbl_${lower}` ||
              t.id.toLowerCase() === nameOrId.toLowerCase()
          );
          return match ? match.id : `tbl_${lower}`;
        };

        const findColId = (tableId: string, colName: string) => {
          const table = formattedTables.find((t) => t.id === tableId);
          if (table) {
            const col = table.columns.find((c) => c.name.toLowerCase() === colName.toLowerCase());
            if (col) return col.id;
          }
          return `c_${tableId.replace(/^tbl_/, '')}_${colName.toLowerCase()}`;
        };

        const formattedRels: Relationship[] = (data.relationships || []).map((r: any, idx: number) => {
          const srcTId = findTableId(r.sourceTable || r.sourceTableId);
          const tgtTId = findTableId(r.targetTable || r.targetTableId);
          const srcC = (r.sourceColumn || r.sourceColumnId || 'id').toLowerCase();
          const tgtC = (r.targetColumn || r.targetColumnId || 'id').toLowerCase();

          return {
            id: r.id || `rel_ai_${idx}`,
            sourceTableId: srcTId,
            sourceColumnId: findColId(srcTId, srcC),
            targetTableId: tgtTId,
            targetColumnId: findColId(tgtTId, tgtC),
            type: r.type || '1:N',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          };
        });

        return {
          tables: formattedTables,
          relationships: formattedRels,
          inferredSource: data.inferredSource || (data.fallback ? 'Локальный AST парсер SQL' : 'AI Реконструктор схемы на основе Gemini'),
        };
      }
    }
  } catch (err) {
    console.warn('API error, falling back to local query parser', err);
  }

  return inferSchemaFromQueriesLocally(sqlQueries);
}
