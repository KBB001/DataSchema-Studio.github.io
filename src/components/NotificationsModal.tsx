import React from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  Database,
  Link,
  GitCommit,
  Terminal,
  Shield,
  Layers,
  AlertCircle
} from 'lucide-react';
import { ChangeNotification } from '../types';

interface NotificationsModalProps {
  notifications: ChangeNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkAllAsRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: ChangeNotification['type']) => {
    switch (type) {
      case 'table_created':
      case 'table_updated':
        return <Database className="w-4 h-4 text-blue-600" />;
      case 'table_deleted':
        return <Trash2 className="w-4 h-4 text-rose-600" />;
      case 'column_added':
      case 'column_modified':
        return <Layers className="w-4 h-4 text-emerald-600" />;
      case 'relation_created':
      case 'relation_deleted':
        return <Link className="w-4 h-4 text-purple-600" />;
      case 'git_committed':
        return <GitCommit className="w-4 h-4 text-slate-800" />;
      case 'sql_executed':
        return <Terminal className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Уведомления об изменениях в проекте</h3>
              <p className="text-[11px] text-slate-500">
                Журнал структурных модификаций таблиц, внешних ключей и коммитов
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-5 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Всего событий: {notifications.length}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Прочитано</span>
            </button>
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 text-rose-600 hover:text-rose-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить</span>
            </button>
          </div>
        </div>

        {/* List of notifications */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          {notifications.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center">
              <Bell className="w-8 h-8 mb-2 opacity-40" />
              <p className="font-medium text-slate-500">Нет новых уведомлений</p>
              <p className="text-[11px] text-slate-400">
                Любые изменения в таблицах, связях или миграциях будут фиксироваться здесь
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                  n.read ? 'bg-white border-slate-200' : 'bg-blue-50/50 border-blue-200 shadow-2xs'
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 truncate">{n.title}</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{n.description}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Автор: <strong className="text-slate-600">{n.author}</strong></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
