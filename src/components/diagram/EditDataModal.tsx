import React, { useState } from 'react';
import { X, Check, Copy, AlertCircle, FileCode, Sparkles } from 'lucide-react';
import { Schema } from '../../types';

interface EditDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: Schema;
  onSaveSchema: (updatedSchema: Schema) => void;
}

export const EditDataModal: React.FC<EditDataModalProps> = ({
  isOpen,
  onClose,
  schema,
  onSaveSchema,
}) => {
  const [jsonString, setJsonString] = useState(() => JSON.stringify(schema, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync if opened
  React.useEffect(() => {
    if (isOpen) {
      setJsonString(JSON.stringify(schema, null, 2));
      setError(null);
    }
  }, [isOpen, schema]);

  if (!isOpen) return null;

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.tables || !Array.isArray(parsed.tables)) {
        throw new Error('Некорректная структура: отсутствует массив "tables"');
      }
      onSaveSchema(parsed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка парсинга JSON');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Редактировать данные диаграммы</h3>
              <p className="text-[11px] text-slate-500">
                Прямое редактирование схемы БД, таблиц, связей и фигур в формате JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* JSON Editor Body */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col space-y-2">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex-1 border border-slate-300 rounded-lg overflow-hidden bg-slate-900 shadow-inner flex flex-col">
            <div className="px-3 py-1.5 bg-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between border-b border-slate-700">
              <span>schema_data.json</span>
              <button
                onClick={handleCopy}
                className="hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
            <textarea
              value={jsonString || ''}
              onChange={(e) => {
                setJsonString(e.target.value);
                setError(null);
              }}
              spellCheck={false}
              className="flex-1 w-full p-3 font-mono text-xs text-emerald-400 bg-slate-900 resize-none focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Изменения вступают в силу немедленно после сохранения
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Применить изменения</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
