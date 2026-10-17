import React, { useState } from 'react';
import { X, Plus, Trash2, Key, Link, Shield, Check, Info } from 'lucide-react';
import { Column, ColumnType, Table } from '../types';

interface TableEditModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTable: Table) => void;
}

const COLOR_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#e11d48', // rose
];

const COLUMN_TYPES: ColumnType[] = [
  'INT',
  'BIGINT',
  'SERIAL',
  'BIGSERIAL',
  'VARCHAR',
  'TEXT',
  'UUID',
  'BOOLEAN',
  'DECIMAL',
  'FLOAT',
  'TIMESTAMP',
  'TIMESTAMPTZ',
  'DATE',
  'JSONB',
  'ENUM',
];

export const TableEditModal: React.FC<TableEditModalProps> = ({
  table,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(table?.name || '');
  const [comment, setComment] = useState(table?.comment || '');
  const [color, setColor] = useState(table?.color || '#3b82f6');
  const [columns, setColumns] = useState<Column[]>(table?.columns ? [...table.columns] : []);

  React.useEffect(() => {
    if (table && isOpen) {
      setName(table.name || '');
      setComment(table.comment || '');
      setColor(table.color || '#3b82f6');
      setColumns([...(table.columns || [])]);
    }
  }, [table, isOpen]);

  if (!isOpen || !table) return null;

  const handleAddColumn = () => {
    const newCol: Column = {
      id: `c_${name}_${Date.now()}`,
      name: `column_${columns.length + 1}`,
      type: 'VARCHAR',
      lengthOrPrecision: '255',
      isPk: false,
      isFk: false,
      isNullable: true,
      isUnique: false,
    };
    setColumns([...columns, newCol]);
  };

  const handleRemoveColumn = (id: string) => {
    setColumns(columns.filter((c) => c.id !== id));
  };

  const handleUpdateColumn = (id: string, updates: Partial<Column>) => {
    setColumns(
      columns.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          // If marked PK, it cannot be nullable
          if (updates.isPk) {
            updated.isNullable = false;
          }
          return updated;
        }
        return c;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...table,
      name: name.trim().toLowerCase().replace(/\s+/g, '_'),
      comment: comment.trim(),
      color,
      columns,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Редактирование таблицы: {name || 'Новая таблица'}
              </h3>
              <p className="text-xs text-slate-500">Настройка колонок, типов данных, ограничений и индексов</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Table Meta Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Имя таблицы (SQL Ident)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="users, orders, payments..."
                required
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Описание / Комментарий</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Назначение таблицы..."
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Цвет карточки</label>
              <div className="flex items-center gap-1.5 pt-1">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Columns Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Столбцы ({columns.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={handleAddColumn}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить столбец</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <th className="py-2.5 px-3">Колонка</th>
                      <th className="py-2.5 px-3">Тип</th>
                      <th className="py-2.5 px-3">Длина/Точность</th>
                      <th className="py-2.5 px-3 text-center" title="Primary Key">PK</th>
                      <th className="py-2.5 px-3 text-center" title="Nullable">Null?</th>
                      <th className="py-2.5 px-3 text-center" title="Unique">Unique</th>
                      <th className="py-2.5 px-3 text-center" title="Index">Index</th>
                      <th className="py-2.5 px-3">По умолчанию</th>
                      <th className="py-2.5 px-3 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {columns.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={col.name || ''}
                            onChange={(e) => handleUpdateColumn(col.id, { name: e.target.value })}
                            className="w-full px-2 py-1 font-mono text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                            placeholder="column_name"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={col.type || 'VARCHAR'}
                            onChange={(e) =>
                              handleUpdateColumn(col.id, { type: e.target.value as ColumnType })
                            }
                            className="w-full px-2 py-1 font-mono text-xs border border-slate-200 rounded bg-white focus:ring-1 focus:ring-blue-500"
                          >
                            {COLUMN_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={col.lengthOrPrecision || ''}
                            onChange={(e) =>
                              handleUpdateColumn(col.id, { lengthOrPrecision: e.target.value })
                            }
                            className="w-20 px-2 py-1 font-mono text-xs border border-slate-200 rounded"
                            placeholder="255, 12,2"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(col.isPk)}
                            onChange={(e) => handleUpdateColumn(col.id, { isPk: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            disabled={Boolean(col.isPk)}
                            checked={Boolean(col.isNullable)}
                            onChange={(e) =>
                              handleUpdateColumn(col.id, { isNullable: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 rounded disabled:opacity-30"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(col.isUnique)}
                            onChange={(e) =>
                              handleUpdateColumn(col.id, { isUnique: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(col.isIndexed)}
                            onChange={(e) =>
                              handleUpdateColumn(col.id, { isIndexed: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={col.defaultValue || ''}
                            onChange={(e) =>
                              handleUpdateColumn(col.id, { defaultValue: e.target.value })
                            }
                            className="w-28 px-2 py-1 font-mono text-xs border border-slate-200 rounded"
                            placeholder="NOW(), 'active'"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveColumn(col.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Удалить столбец"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
