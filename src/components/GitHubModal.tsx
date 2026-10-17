import React, { useState } from 'react';
import {
  X,
  Github,
  GitCommit,
  GitBranch,
  GitPullRequest,
  Check,
  Clock,
  ArrowUpRight,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { GitCommitRecord, Schema } from '../types';
import { generateSql } from '../utils/sqlGenerator';

interface GitHubModalProps {
  schema: Schema;
  isOpen: boolean;
  onClose: () => void;
  onRecordChange: (title: string, description: string, type: any) => void;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({
  schema,
  isOpen,
  onClose,
  onRecordChange,
}) => {
  const [repo, setRepo] = useState('enterprise-org/core-database-architecture');
  const [branch, setBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState(
    `feat(db): update schema tables (${schema.tables.length} tables, ${schema.relationships.length} rels)`
  );
  const [isPushing, setIsPushing] = useState(false);

  // Commits history
  const [commitHistory, setCommitHistory] = useState<GitCommitRecord[]>([
    {
      id: 'c-1',
      hash: 'a7f94b2',
      message: 'Initial database architecture schema',
      branch: 'main',
      author: 'Бекжан Кенесбек',
      timestamp: '2 часа назад',
      migrationFile: 'migrations/V1__init_architecture.sql',
      tablesCount: 6,
      changesSummary: '+6 tables, +5 foreign keys',
    },
    {
      id: 'c-0',
      hash: '91e0cb1',
      message: 'chore: init database repository',
      branch: 'main',
      author: 'Александр Архитектор',
      timestamp: 'Вчера',
      migrationFile: 'migrations/V0__bootstrap.sql',
      tablesCount: 2,
      changesSummary: '+2 tables',
    },
  ]);

  const [activeTab, setActiveTab] = useState<'commit' | 'history' | 'settings'>('commit');

  if (!isOpen) return null;

  const migrationSql = generateSql(schema, {
    dialect: schema.dialect,
    includeDropTable: false,
    includeForeignKeys: true,
    includeIndexes: true,
    includeComments: true,
  });

  const handlePushCommit = async () => {
    if (!commitMessage.trim()) return;
    setIsPushing(true);

    const migrationFileName = `V${commitHistory.length + 1}__${commitMessage
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 30)}.sql`;

    try {
      const res = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: repo,
          branch,
          migrationName: migrationFileName,
          sqlContent: migrationSql,
        }),
      });
      const data = await res.json();

      const newRecord: GitCommitRecord = {
        id: `c-${Date.now()}`,
        hash: data.commitHash || Math.random().toString(16).substring(2, 9),
        message: commitMessage,
        branch,
        author: 'Бекжан Кенесбек',
        timestamp: 'Только что',
        migrationFile: `migrations/${migrationFileName}`,
        tablesCount: schema.tables.length,
        changesSummary: `${schema.tables.length} таблиц в схеме`,
      };

      setCommitHistory([newRecord, ...commitHistory]);
      onRecordChange(
        'Коммит в GitHub репозиторий',
        `Закоммичена миграция ${migrationFileName} [${newRecord.hash}] в ветку ${branch}`,
        'git_committed'
      );
      setActiveTab('history');
    } catch (err) {
      console.error(err);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Интеграция с GitHub: Версионный контроль БД
              </h3>
              <p className="text-xs text-slate-500">Автоматическая генерация миграций и коммиты в Git</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('commit')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'commit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Создать коммит
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              История ({commitHistory.length})
            </button>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {activeTab === 'commit' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="text-slate-500 font-medium">Репозиторий:</label>
                  <div className="font-mono font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Github className="w-3.5 h-3.5" />
                    <span>{repo}</span>
                  </div>
                </div>
                <div>
                  <label className="text-slate-500 font-medium">Ветка:</label>
                  <div className="font-mono font-semibold text-purple-700 flex items-center gap-1.5 mt-0.5">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>{branch}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Сообщение коммита (Commit Message):</label>
                <input
                  type="text"
                  value={commitMessage || ''}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  placeholder="feat(schema): add new tables..."
                />
              </div>

              {/* Diff / Migration SQL Preview */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-700 font-semibold">
                  <span>Файл миграции (Flyway / Liquibase формат):</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    V{commitHistory.length + 1}__migration.sql
                  </span>
                </div>
                <div className="h-56 bg-slate-900 text-slate-100 rounded-xl p-3.5 font-mono text-[11px] overflow-auto border border-slate-800 select-text leading-relaxed">
                  <pre>{migrationSql}</pre>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handlePushCommit}
                  disabled={isPushing || !commitMessage.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  <GitCommit className="w-4 h-4" />
                  <span>{isPushing ? 'Отправка в репозиторий...' : 'Закоммитить и отправить (Push)'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Журнал коммитов архитектуры БД
              </h4>

              <div className="space-y-2">
                {commitHistory.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {c.hash}
                        </span>
                        <span className="font-semibold text-slate-900 truncate">{c.message}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        <span>Автор: {c.author}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-600">{c.migrationFile}</span>
                        <span>•</span>
                        <span>{c.timestamp}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-mono text-[10px]">
                        {c.changesSummary}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
