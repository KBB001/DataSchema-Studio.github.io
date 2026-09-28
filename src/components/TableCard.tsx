import React, { useState } from 'react';
import {
  Key,
  Link,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  Copy,
  Code,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  Check
} from 'lucide-react';
import { Table, CanvasSettings } from '../types';

interface TableCardProps {
  table: Table;
  isSelected: boolean;
  onSelect: (tableId: string) => void;
  onStartDrag: (e: React.MouseEvent, tableId: string) => void;
  onEditTable: (table: Table) => void;
  onDeleteTable: (tableId: string) => void;
  onAddColumn: (tableId: string) => void;
  onStartConnect: (tableId: string, columnId: string) => void;
  onDuplicateTable?: (table: Table) => void;
  isConnecting: boolean;
  connectingSource: { tableId: string; columnId: string } | null;
  canvasSettings?: CanvasSettings;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  isSelected,
  onSelect,
  onStartDrag,
  onEditTable,
  onDeleteTable,
  onAddColumn,
  onStartConnect,
  onDuplicateTable,
  isConnecting,
  connectingSource,
  canvasSettings,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const isRounded = canvasSettings ? canvasSettings.roundedCorners : true;
  const hasShadow = canvasSettings ? canvasSettings.dropShadow : true;
  const isSketch = canvasSettings ? canvasSettings.sketchMode : false;

  const defaultCol = table.columns[0]?.id || 'id';

  // Helper to format short SQL for this table
  const handleQuickCopySql = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cols = table.columns
      .map((c) => {
        let def = `  ${c.name} ${c.type}`;
        if (c.lengthOrPrecision) def += `(${c.lengthOrPrecision})`;
        if (c.isPk) def += ' PRIMARY KEY';
        else {
          if (!c.isNullable) def += ' NOT NULL';
          if (c.isUnique) def += ' UNIQUE';
          if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
        }
        return def;
      })
      .join(',\n');
    const ddl = `CREATE TABLE ${table.name} (\n${cols}\n);`;
    navigator.clipboard.writeText(ddl);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 1800);
  };

  return (
    <div
      id={`table-node-${table.id}`}
      style={{
        transform: `translate(${table.x}px, ${table.y}px)`,
        width: '280px',
        backgroundColor: table.fillColor || '#ffffff',
        borderColor: table.strokeColor || (isSelected ? '#2563eb' : '#cbd5e1'),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(table.id);
      }}
      className={`absolute select-none bg-white border transition-shadow cursor-default z-10 ${
        isRounded ? 'rounded-xl' : 'rounded-none'
      } ${hasShadow ? 'shadow-md hover:shadow-xl' : 'shadow-none'} ${
        isSketch ? 'rotate-[0.3deg]' : ''
      } ${
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg'
          : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      {/* Table Header (Draggable handle) */}
      <div
        onMouseDown={(e) => onStartDrag(e, table.id)}
        className={`px-3 py-2.5 cursor-grab active:cursor-grabbing flex items-center justify-between border-b border-slate-200 ${
          isRounded ? 'rounded-t-xl' : 'rounded-none'
        }`}
        style={{
          borderTop: `4px solid ${table.strokeColor || table.color || '#3b82f6'}`,
          backgroundColor: table.fillColor ? `${table.fillColor}f2` : '#f8fafc',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
            style={{ backgroundColor: table.color || '#3b82f6' }}
          />
          <span
            className="font-bold text-xs truncate text-slate-900 tracking-tight"
            style={{ color: table.textColor || '#0f172a' }}
            title={table.name}
          >
            {table.name}
          </span>
          <span className="text-[10px] text-slate-500 font-mono shrink-0">
            ({table.columns.length})
          </span>
        </div>

        {/* Quick Table Actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleQuickCopySql}
            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition-colors"
            title="Скопировать DDL этой таблицы"
          >
            {copiedSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Code className="w-3 h-3" />}
          </button>
          {onDuplicateTable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateTable(table);
              }}
              className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition-colors"
              title="Дублировать таблицу"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddColumn(table.id);
            }}
            className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors"
            title="Добавить колонку"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditTable(table);
            }}
            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition-colors"
            title="Свойства таблицы"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTable(table.id);
            }}
            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition-colors"
            title="Удалить таблицу"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Columns List */}
      <div className="py-1 text-xs divide-y divide-slate-100 max-h-84 overflow-y-auto">
        {table.columns.map((col) => {
          const isSource = connectingSource?.tableId === table.id && connectingSource?.columnId === col.id;
          return (
            <div
              key={col.id}
              id={`table-col-${table.id}-${col.id}`}
              className={`group relative flex items-center justify-between px-3 py-1.5 hover:bg-blue-50/50 transition-colors ${
                col.isPk ? 'bg-amber-50/50 font-medium' : ''
              } ${isSource ? 'bg-purple-100 ring-1 ring-purple-500' : ''}`}
            >
              {/* Left Connector Handle (target/source anchor) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartConnect(table.id, col.id);
                }}
                className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs transition-all z-20 ${
                  isConnecting
                    ? 'bg-purple-600 scale-125 ring-2 ring-purple-300'
                    : 'bg-slate-400 opacity-0 group-hover:opacity-100 hover:bg-purple-600 hover:scale-125'
                }`}
                title="Связать внешний ключ (Drag / Click to connect)"
              />

              {/* Column Name & Key Icons */}
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                {col.isPk ? (
                  <span title="Первичный ключ (PK)" className="shrink-0 flex items-center">
                    <Key className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                  </span>
                ) : col.isFk ? (
                  <span title="Внешний ключ (FK)" className="shrink-0 flex items-center">
                    <Link className="w-3.5 h-3.5 text-purple-600" />
                  </span>
                ) : (
                  <span className="w-3.5 h-3.5 block shrink-0 text-slate-300 text-xs text-center font-mono">
                    •
                  </span>
                )}

                <span
                  className={`truncate font-mono text-[11px] ${
                    col.isPk ? 'font-bold text-slate-900' : 'text-slate-800'
                  }`}
                  title={`${col.name} ${col.comment ? `(${col.comment})` : ''}`}
                >
                  {col.name}
                </span>

                {col.isUnique && !col.isPk && (
                  <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold border border-emerald-300">
                    UQ
                  </span>
                )}
              </div>

              {/* Data Type & Flags */}
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  col.isPk
                    ? 'bg-amber-100/70 border-amber-300 text-amber-900'
                    : col.isFk
                    ? 'bg-purple-100/70 border-purple-300 text-purple-900'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  {col.type}
                  {col.lengthOrPrecision ? `(${col.lengthOrPrecision})` : ''}
                </span>

                {col.isNullable && (
                  <span className="text-[10px] text-slate-400 font-mono font-bold" title="Nullable (NULL разрешен)">
                    ?
                  </span>
                )}
              </div>

              {/* Right Connector Handle (target/source anchor) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartConnect(table.id, col.id);
                }}
                className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs transition-all z-20 ${
                  isConnecting
                    ? 'bg-purple-600 scale-125 ring-2 ring-purple-300'
                    : 'bg-slate-400 opacity-0 group-hover:opacity-100 hover:bg-purple-600 hover:scale-125'
                }`}
                title="Связать внешний ключ (Drag / Click to connect)"
              />
            </div>
          );
        })}
      </div>

      {/* Table Footer */}
      {table.comment && (
        <div
          className={`px-3 py-1.5 bg-slate-50 text-[10px] text-slate-500 border-t border-slate-200 truncate ${
            isRounded ? 'rounded-b-xl' : 'rounded-none'
          }`}
          title={table.comment}
        >
          {table.comment}
        </div>
      )}

      {/* Magnetic Anchor Points on Table Borders (when enabled) */}
      {canvasSettings?.showConnectionPoints && (isHovered || isSelected) && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(table.id, defaultCol);
            }}
            className="w-2.5 h-2.5 bg-blue-500 hover:bg-blue-600 rounded-full border border-white absolute -top-1 left-1/2 -translate-x-1/2 z-20 shadow-xs cursor-crosshair"
            title="Связать (Сверху)"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(table.id, defaultCol);
            }}
            className="w-2.5 h-2.5 bg-blue-500 hover:bg-blue-600 rounded-full border border-white absolute top-1/2 -right-1 -translate-y-1/2 z-20 shadow-xs cursor-crosshair"
            title="Связать (Справа)"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(table.id, defaultCol);
            }}
            className="w-2.5 h-2.5 bg-blue-500 hover:bg-blue-600 rounded-full border border-white absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 shadow-xs cursor-crosshair"
            title="Связать (Снизу)"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(table.id, defaultCol);
            }}
            className="w-2.5 h-2.5 bg-blue-500 hover:bg-blue-600 rounded-full border border-white absolute top-1/2 -left-1 -translate-y-1/2 z-20 shadow-xs cursor-crosshair"
            title="Связать (Слева)"
          />
        </>
      )}

      {/* Directional Connection Arrows (when enabled) */}
      {canvasSettings?.showConnectionArrows && isHovered && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(table.id, defaultCol);
            }}
            className="p-0.5 bg-blue-600 text-white rounded-full absolute -top-5 left-1/2 -translate-x-1/2 z-20 shadow-md hover:scale-125 transition-transform"
            title="Создать связь вверх"
          >
            <ArrowUp className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(table.id, defaultCol);
            }}
            className="p-0.5 bg-blue-600 text-white rounded-full absolute top-1/2 -right-5 -translate-y-1/2 z-20 shadow-md hover:scale-125 transition-transform"
            title="Создать связь вправо"
          >
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(table.id, defaultCol);
            }}
            className="p-0.5 bg-blue-600 text-white rounded-full absolute -bottom-5 left-1/2 -translate-x-1/2 z-20 shadow-md hover:scale-125 transition-transform"
            title="Создать связь вниз"
          >
            <ArrowDown className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(table.id, defaultCol);
            }}
            className="p-0.5 bg-blue-600 text-white rounded-full absolute top-1/2 -left-5 -translate-y-1/2 z-20 shadow-md hover:scale-125 transition-transform"
            title="Создать связь влево"
          >
            <ArrowLeft className="w-2.5 h-2.5" />
          </button>
        </>
      )}
    </div>
  );
};
