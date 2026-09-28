import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  AlertTriangle,
  Zap,
  Search,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Code,
  ShieldAlert,
  Flame,
  Wrench,
  Layers,
  Terminal,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Schema } from '../types';
import { handbookArticles, systemCrashCatalog, HandbookArticle, SystemCrashSolution } from '../data/handbookData';

interface HandbookAndDebugToolProps {
  schema: Schema;
  onRecordChange: (title: string, description: string, type: any) => void;
}

export const HandbookAndDebugTool: React.FC<HandbookAndDebugToolProps> = ({
  schema,
  onRecordChange,
}) => {
  const [activeTab, setActiveTab] = useState<'handbook' | 'optimizer' | 'crashes'>('handbook');

  // Handbook State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<HandbookArticle>(handbookArticles[0]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Optimizer State
  const [optimizerQuery, setOptimizerQuery] = useState(
    `SELECT 
    o.id, 
    o.order_number, 
    o.total_amount, 
    u.full_name, 
    u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'COMPLETED' 
  AND o.created_at >= NOW() - INTERVAL '30 days'
ORDER BY o.total_amount DESC;`
  );
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<{
    explanation: string;
    bottlenecks: string[];
    suggestedIndexes: string[];
    optimizedSql: string;
  } | null>(null);

  // Crash Debugger State
  const [selectedCrash, setSelectedCrash] = useState<SystemCrashSolution>(systemCrashCatalog[0]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<{
    rootCause: string;
    immediateAction: string;
    permanentSolution: string;
    preventiveChecklist: string[];
  } | null>(null);

  const categories = [
    { id: 'all', label: 'Все разделы' },
    { id: 'architecture', label: 'Архитектура' },
    { id: 'normalization', label: 'Нормализация' },
    { id: 'indexing', label: 'Индексы & EXPLAIN' },
    { id: 'transactions', label: 'Транзакции & Блокировки' },
    { id: 'scaling', label: 'HighLoad & Пулинг' },
  ];

  const filteredArticles = handbookArticles.filter((art) => {
    const matchCat = selectedCategory === 'all' || art.category === selectedCategory;
    const matchSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.badge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRunOptimizer = async () => {
    if (!optimizerQuery.trim()) return;
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/gemini/optimize-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: optimizerQuery,
          dialect: schema.dialect,
          schemaContext: schema,
        }),
      });
      const data = await res.json();
      setOptimizationResult(data);
      onRecordChange('Оптимизация SQL через AI', `Проанализирован медленный запрос`, 'sql_executed');
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDiagnoseCrash = async (crash: SystemCrashSolution) => {
    setSelectedCrash(crash);
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/gemini/diagnose-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorLog: `${crash.title}: ${crash.symptom} (Code: ${crash.code})`,
          schemaContext: schema,
        }),
      });
      const data = await res.json();
      setDiagnosticsResult(data);
      onRecordChange('Диагностика сбоя БД', `Выполнен анализ инцидента [${crash.code}] ${crash.title}`, 'sql_executed');
    } catch (e) {
      console.error(e);
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] bg-slate-100 flex flex-col overflow-hidden p-4 space-y-3">
      {/* Top Banner & Tab Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Книга Архитектора БД & Инструмент Отладки
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                Gemini AI Engine
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Энциклопедия проектирования СУБД, автоматическая оптимизация запросов и диагностика критических аварийных сбоев
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('handbook')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'handbook' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Книга & Справочник</span>
          </button>

          <button
            onClick={() => setActiveTab('optimizer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'optimizer' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Оптимизатор запросов</span>
          </button>

          <button
            onClick={() => setActiveTab('crashes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'crashes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Отладчик критических сбоев</span>
          </button>
        </div>
      </div>

      {/* TAB 1: HANDBOOK */}
      {activeTab === 'handbook' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 overflow-hidden">
          {/* Left Sidebar: Chapters list */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-200 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery || ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по разделам, терминам..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-0.5 rounded-md whitespace-nowrap font-medium transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Articles list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedArticle.id === art.id
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs'
                      : 'bg-white border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>{art.title}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{art.summary}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium">
                      {art.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {art.readTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Area: Selected Article Reader */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 overflow-y-auto flex flex-col space-y-6 leading-relaxed">
            <div className="space-y-2 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedArticle.badge}
                </span>
                <span className="text-xs text-slate-400">• {selectedArticle.readTime} чтения</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{selectedArticle.title}</h2>
              <p className="text-xs text-slate-600 font-medium">{selectedArticle.summary}</p>
            </div>

            {/* Main Article Content */}
            <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100 font-sans">
              {selectedArticle.content}
            </div>

            {/* Best Practices */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Ключевые рекомендации и Best Practices:</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-emerald-800">
                {selectedArticle.bestPractices.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pitfalls */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Типичные архитектурные ловушки (Pitfalls):</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-amber-800">
                {selectedArticle.pitfalls.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SQL Examples */}
            {selectedArticle.sqlExamples.map((sqlCode, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                    <span>SQL Пример #{idx + 1}</span>
                  </span>
                  <button
                    onClick={() => handleCopy(sqlCode, `sql-${idx}`)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                  >
                    {copiedCode === `sql-${idx}` ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedCode === `sql-${idx}` ? 'Скопировано' : 'Копировать SQL'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto select-text leading-relaxed border border-slate-800">
                  <pre>{sqlCode}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: QUERY OPTIMIZER */}
      {activeTab === 'optimizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 overflow-hidden">
          {/* Input Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-slate-900 text-xs">Анализ медленного SQL запроса</h3>
              </div>
              <button
                id="btn-run-optimizer"
                onClick={handleRunOptimizer}
                disabled={isOptimizing}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>{isOptimizing ? 'Анализирую план...' : 'Оптимизировать'}</span>
              </button>
            </div>

            <textarea
              value={optimizerQuery || ''}
              onChange={(e) => setOptimizerQuery(e.target.value)}
              className="flex-1 w-full p-4 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none resize-none leading-relaxed select-text"
              placeholder="Вставьте SQL запрос для поиска узких мест..."
            />

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>СУБД: <strong className="text-slate-800">{schema.dialect}</strong></span>
              <span>Таблиц в схеме: <strong>{schema.tables.length}</strong></span>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 overflow-y-auto space-y-4">
            {optimizationResult ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-blue-900">Заключение AI Анализатора:</div>
                  <p className="text-blue-800 leading-relaxed">{optimizationResult.explanation}</p>
                </div>

                {/* Bottlenecks */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Обнаруженные узкие места (Bottlenecks):</span>
                  </h4>
                  <div className="space-y-1">
                    {optimizationResult.bottlenecks.map((b, i) => (
                      <div key={i} className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs text-amber-900">
                        {b}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Indexes */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Рекомендуемые индексы:</span>
                  </h4>
                  <div className="space-y-1">
                    {optimizationResult.suggestedIndexes.map((idxSql, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg flex items-center justify-between"
                      >
                        <span>{idxSql}</span>
                        <button
                          onClick={() => handleCopy(idxSql, `idx-${i}`)}
                          className="text-[10px] text-slate-400 hover:text-white ml-2"
                        >
                          {copiedCode === `idx-${i}` ? 'Скопировано' : 'Копия'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optimized SQL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Переписанный оптимизированный SQL:</span>
                    <button
                      onClick={() => handleCopy(optimizationResult.optimizedSql, 'opt-sql')}
                      className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedCode === 'opt-sql' ? 'Скопировано' : 'Копировать SQL'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 font-mono text-xs overflow-x-auto select-text border border-slate-800">
                    <pre>{optimizationResult.optimizedSql}</pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8 space-y-2">
                <Zap className="w-8 h-8 text-amber-500 opacity-50" />
                <p className="text-xs font-medium text-slate-600">Оптимизатор готов к работе</p>
                <p className="text-[11px] text-slate-400 max-w-sm">
                  Нажмите «Оптимизировать» для детального разбора плана запроса, рекомендаций по составным индексам и переписыванию логики
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CRASH DEBUGGER */}
      {activeTab === 'crashes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 overflow-hidden">
          {/* Catalog of known crashes */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Каталог критических аварийных сбоев СУБД
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {systemCrashCatalog.map((crash) => (
                <div
                  key={crash.id}
                  onClick={() => handleDiagnoseCrash(crash)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedCrash.id === crash.id
                      ? 'bg-rose-50/70 border-rose-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{crash.title}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        crash.severity === 'Critical'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {crash.severity}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-rose-600 bg-rose-50/60 p-1 rounded mt-1.5 truncate">
                    Code: {crash.code} | {crash.symptom}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic & Solution View */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 overflow-y-auto space-y-5">
            {/* Crash Header */}
            <div className="space-y-1 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded uppercase font-mono">
                  {selectedCrash.code}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase">{selectedCrash.category}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{selectedCrash.title}</h3>
              <p className="text-xs text-rose-700 font-mono bg-rose-50 p-2 rounded-lg border border-rose-100">
                {selectedCrash.symptom}
              </p>
            </div>

            {/* Immediate Emergency Commands */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                <Flame className="w-4 h-4" />
                <span>Экстренные команды для немедленного снятия аварии:</span>
              </h4>
              {selectedCrash.immediateCommands.map((cmd, i) => (
                <div key={i} className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs overflow-x-auto relative select-text border border-slate-800">
                  <pre>{cmd}</pre>
                </div>
              ))}
            </div>

            {/* Root Cause & Fix */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Первопричина (Root Cause):</span>
              </h4>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                {diagnosticsResult?.rootCause || selectedCrash.rootCause}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <Wrench className="w-4 h-4" />
                <span>Долгосрочное системное решение (Permanent Fix):</span>
              </h4>
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                {diagnosticsResult?.permanentSolution || selectedCrash.permanentFix}
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-800">Совет по предотвращению (Prevention Tip):</h4>
              <div className="flex items-center gap-2 text-xs text-slate-700 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{selectedCrash.preventionTip}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
