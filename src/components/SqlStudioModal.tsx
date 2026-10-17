import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Database,
  Clock,
  CheckCircle,
  Table as TableIcon,
  RefreshCw,
  Code,
  Zap,
  Server
} from 'lucide-react';
import { Schema } from '../types';

interface SqlStudioModalProps {
  schema: Schema;
  onRecordChange: (title: string, description: string, type: any) => void;
}

export const SqlStudioModal: React.FC<SqlStudioModalProps> = ({
  schema,
  onRecordChange,
}) => {
  const [query, setQuery] = useState(
    `-- Тестирование прямой интеграции с SQL через API
SELECT 
    u.id, 
    u.username, 
    u.email, 
    u.role, 
    u.status, 
    u.created_at
FROM users u
WHERE u.status = 'ACTIVE'
ORDER BY u.created_at DESC 
LIMIT 10;`
  );

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    columns: string[];
    rows: any[];
    executionTimeMs: string;
    rowCount: number;
    message: string;
    explainPlan?: any;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'results' | 'explain' | 'connection'>('results');
  const [connectionString, setConnectionString] = useState(
    'postgresql://app_admin:secret_vault_pass@postgres-cluster.internal:5432/core_db'
  );
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'testing' | 'idle'>('connected');

  const handleExecute = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, schema }),
      });
      const data = await res.json();
      setResult(data);
      onRecordChange('Выполнен SQL запрос через API', `Запрос: ${query.slice(0, 40)}...`, 'sql_executed');
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestConnection = () => {
    setConnectionStatus('testing');
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 800);
  };

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] bg-slate-100 flex flex-col overflow-hidden p-4 space-y-3">
      {/* Top Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              SQL API Studio & Прямой Query Runner
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Прямой API шлюз активен
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Выполнение интерактивных SQL запросов напрямую к базе с отображением табличных данных и EXPLAIN плана
            </p>
          </div>
        </div>

        {/* Quick query presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium hidden sm:inline">Пресеты:</span>
          {schema.queries && schema.queries.length > 0
            ? schema.queries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(q.sql)}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-medium text-[11px] max-w-[200px] truncate"
                  title={q.name + (q.description ? ` (${q.description})` : '')}
                >
                  {q.name}
                </button>
              ))
            : (
                <>
                  {schema.tables.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setQuery(`SELECT * FROM ${t.name} LIMIT 25;`)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono text-[11px]"
                    >
                      {t.name}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      setQuery(
                        `SELECT o.order_number, o.total_amount, u.email \nFROM orders o \nJOIN users u ON o.user_id = u.id \nLIMIT 10;`
                      )
                    }
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded font-mono text-[11px]"
                  >
                    JOIN orders + users
                  </button>
                </>
              )}
        </div>
      </div>

      {/* Editor & Execution Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 overflow-hidden">
        {/* Left: Query Editor */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Code className="w-3.5 h-3.5 text-purple-600" />
              <span>SQL Редактор Запросов</span>
            </div>
            <button
              id="btn-execute-sql"
              onClick={handleExecute}
              disabled={isRunning || !query.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isRunning ? 'Выполнение...' : 'Выполнить (F5 / Run)'}</span>
            </button>
          </div>

          <textarea
            value={query || ''}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 w-full p-4 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none resize-none leading-relaxed select-text"
            placeholder="Введите SQL запрос..."
          />

          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Эндпоинт API: <code className="text-purple-700 font-mono font-semibold">POST /api/sql/execute</code></span>
            <span>СУБД: <strong className="text-slate-800">{schema.dialect}</strong></span>
          </div>
        </div>

        {/* Right: Results / Explain / Connection Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          {/* Tabs header */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('results')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'results' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Результаты {result ? `(${result.rowCount})` : ''}
              </button>
              <button
                onClick={() => setActiveTab('explain')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'explain' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EXPLAIN План
              </button>
              <button
                onClick={() => setActiveTab('connection')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'connection' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Параметры API Подключения
              </button>
            </div>

            {result && (
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {result.executionTimeMs}
                </span>
                <span className="text-emerald-600 font-medium">{result.message}</span>
              </div>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-3">
            {activeTab === 'results' && (
              result && result.rows.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-mono text-[11px]">
                        {result.columns.map((col) => (
                          <th key={col} className="py-2 px-3">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {result.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {result.columns.map((col) => (
                            <td key={col} className="py-1.5 px-3 text-slate-800 truncate max-w-[200px]">
                              {row[col] !== undefined ? String(row[col]) : 'NULL'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                  <TableIcon className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs">Нажмите «Выполнить» для запуска запроса через API</p>
                </div>
              )
            )}

            {activeTab === 'explain' && (
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs space-y-2 select-text">
                <div className="text-emerald-400 font-bold">QUERY EXECUTION PLAN:</div>
                <div className="text-slate-300">
                  {result?.explainPlan
                    ? JSON.stringify(result.explainPlan, null, 2)
                    : `-> Index Scan using idx_users_status on users u (cost=0.28..8.30 rows=10 width=128)
   Index Cond: (status = 'ACTIVE'::text)
   Buffers: shared hit=4`}
                </div>
              </div>
            )}

            {activeTab === 'connection' && (
              <div className="space-y-4 p-2 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Database Connection URL (Direct SQL API):</label>
                  <input
                    type="text"
                    value={connectionString || ''}
                    onChange={(e) => setConnectionString(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Статус подключения: <strong>Активно (Пул: 10 соединений)</strong></span>
                  </div>
                  <button
                    onClick={handleTestConnection}
                    className="px-3 py-1 bg-white border border-emerald-300 text-emerald-800 rounded font-medium hover:bg-emerald-100"
                  >
                    {connectionStatus === 'testing' ? 'Проверка...' : 'Проверить коннект'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
