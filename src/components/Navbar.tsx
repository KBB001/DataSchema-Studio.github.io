import React from 'react';
import {
  Database,
  Users,
  BookOpen,
  Terminal,
  Github,
  FileCode,
  Bell,
  Plus,
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react';
import { SqlDialect } from '../types';

interface NavbarProps {
  currentTab: 'canvas' | 'access' | 'handbook' | 'sqlStudio';
  setCurrentTab: (tab: 'canvas' | 'access' | 'handbook' | 'sqlStudio') => void;
  dialect: SqlDialect;
  setDialect: (d: SqlDialect) => void;
  onOpenSqlModal: () => void;
  onOpenGitHubModal: () => void;
  onOpenAddTableModal: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  tablesCount: number;
  relationsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  dialect,
  setDialect,
  onOpenSqlModal,
  onOpenGitHubModal,
  onOpenAddTableModal,
  onOpenNotifications,
  unreadNotificationsCount,
  tablesCount,
  relationsCount
}) => {
  return (
    <header id="app-navbar" className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-xs select-none z-30">
      {/* Brand & Stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-sm tracking-tight">DataSchema Studio</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                v2.4
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Dialect Selector */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span className="text-slate-500 text-[11px] font-medium">СУБД:</span>
            <select
              id="dialect-selector"
              value={dialect || 'PostgreSQL'}
              onChange={(e) => setDialect(e.target.value as SqlDialect)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
              title="Текущий диалект схемы базы данных"
            >
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="MySQL">MySQL 8.0</option>
              <option value="SQLite">SQLite 3</option>
              <option value="MSSQL">MS SQL Server</option>
              <option value="Oracle">Oracle DB</option>
            </select>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>{tablesCount} табл.</span>
          <span>•</span>
          <span>{relationsCount} связей</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
        <button
          id="nav-tab-canvas"
          onClick={() => setCurrentTab('canvas')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
            currentTab === 'canvas'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>Диаграмма & Схема</span>
        </button>

        <button
          id="nav-tab-access"
          onClick={() => setCurrentTab('access')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
            currentTab === 'access'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          <span>Доступ & Права (RBAC)</span>
        </button>

        <button
          id="nav-tab-handbook"
          onClick={() => setCurrentTab('handbook')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
            currentTab === 'handbook'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span className="flex items-center gap-1">
            Книга БД & AI Отладчик
            <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
          </span>
        </button>

        <button
          id="nav-tab-sqlstudio"
          onClick={() => setCurrentTab('sqlStudio')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
            currentTab === 'sqlStudio'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-purple-600" />
          <span>SQL API Studio</span>
        </button>
      </nav>

      {/* Action Tools */}
      <div className="flex items-center gap-2">
        <button
          id="btn-sql-modal"
          onClick={onOpenSqlModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-2xs"
          title="Экспорт, импорт SQL/JSON и автогенерация из запросов"
        >
          <FileCode className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden md:inline">SQL Импорт / Экспорт</span>
        </button>

        <button
          id="btn-github-modal"
          onClick={onOpenGitHubModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-2xs"
          title="Версионный контроль архитектуры БД через GitHub"
        >
          <Github className="w-3.5 h-3.5 text-slate-900" />
          <span className="hidden lg:inline">GitHub</span>
        </button>

        <button
          id="btn-notifications"
          onClick={onOpenNotifications}
          className="relative p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          title="Уведомления об изменениях в архитектуре"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {currentTab === 'canvas' && (
          <button
            id="btn-add-table-primary"
            onClick={onOpenAddTableModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Таблица</span>
          </button>
        )}
      </div>
    </header>
  );
};
