import React, { useState } from 'react';
import { X, Trash2, Link, ArrowRight, ShieldCheck } from 'lucide-react';
import { CascadeRule, Relationship, RelationType, Schema } from '../types';

interface RelationModalProps {
  relationship: Relationship | null;
  schema: Schema;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRel: Relationship) => void;
  onDelete: (relId: string) => void;
}

export const RelationModal: React.FC<RelationModalProps> = ({
  relationship,
  schema,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [type, setType] = useState<RelationType>(relationship?.type || '1:N');
  const [onDeleteRule, setOnDeleteRule] = useState<CascadeRule>(relationship?.onDelete || 'CASCADE');
  const [onUpdateRule, setOnUpdateRule] = useState<CascadeRule>(relationship?.onUpdate || 'CASCADE');
  const [name, setName] = useState(relationship?.name || '');

  React.useEffect(() => {
    if (relationship && isOpen) {
      setType(relationship.type || '1:N');
      setOnDeleteRule(relationship.onDelete || 'CASCADE');
      setOnUpdateRule(relationship.onUpdate || 'CASCADE');
      setName(relationship.name || '');
    }
  }, [relationship, isOpen]);

  if (!isOpen || !relationship) return null;

  const srcTable = schema.tables.find((t) => t.id === relationship.sourceTableId);
  const tgtTable = schema.tables.find((t) => t.id === relationship.targetTableId);
  const srcCol = srcTable?.columns.find((c) => c.id === relationship.sourceColumnId);
  const tgtCol = tgtTable?.columns.find((c) => c.id === relationship.targetColumnId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...relationship,
      type,
      onDelete: onDeleteRule,
      onUpdate: onUpdateRule,
      name: name.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-slate-900 text-sm">Параметры связи (Foreign Key)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Linked entities display */}
          <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-purple-700">Внешний ключ (FK)</div>
              <div className="font-mono font-semibold text-slate-900">
                {srcTable?.name}.{srcCol?.name}
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-purple-400 shrink-0 mx-2" />

            <div className="space-y-0.5 text-right">
              <div className="text-[10px] uppercase font-bold text-emerald-700">Первичный ключ (PK)</div>
              <div className="font-mono font-semibold text-slate-900">
                {tgtTable?.name}.{tgtCol?.name}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700">Имя ограничения (Constraint Name)</label>
            <input
              type="text"
              value={name || ''}
              onChange={(e) => setName(e.target.value)}
              placeholder={`fk_${srcTable?.name}_${srcCol?.name}`}
              className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700">Тип кардинальности</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RelationType)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-purple-500"
            >
              <option value="1:N">1:N (Один ко многим — стандартный Foreign Key)</option>
              <option value="1:1">1:1 (Один к одному — строго уникальная связь)</option>
              <option value="N:M">N:M (Многие ко многим)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-slate-700">ON DELETE</label>
              <select
                value={onDeleteRule}
                onChange={(e) => setOnDeleteRule(e.target.value as CascadeRule)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-purple-500"
              >
                <option value="CASCADE">CASCADE (удалить дочерние)</option>
                <option value="RESTRICT">RESTRICT (запретить удаление)</option>
                <option value="SET NULL">SET NULL (обнулить FK)</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-700">ON UPDATE</label>
              <select
                value={onUpdateRule}
                onChange={(e) => setOnUpdateRule(e.target.value as CascadeRule)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-purple-500"
              >
                <option value="CASCADE">CASCADE</option>
                <option value="RESTRICT">RESTRICT</option>
                <option value="SET NULL">SET NULL</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onDelete(relationship.id);
                onClose();
              }}
              className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium px-2 py-1 hover:bg-rose-50 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить связь</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-xs"
              >
                Применить
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
