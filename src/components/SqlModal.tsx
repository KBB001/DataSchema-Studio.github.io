import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Download,
  Upload,
  Check,
  FileCode,
  Sparkles,
  Database,
  ArrowRight,
  Code,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Settings,
  RefreshCw,
  GitBranch,
  Terminal,
  BookOpen,
  Filter,
  CheckCircle2,
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Schema, SqlDialect, Table, Relationship, Column } from '../types';
import {
  generateSql,
  generateSeedDataSql,
  generateMermaidErDiagram,
  generateDbml,
  generateMigrationScript,
  parseSqlDdl,
  SqlExportOptions
} from '../utils/sqlGenerator';
import { generateSchemaFromSql } from '../utils/sqlQueryParser';

interface SqlModalProps {
  schema: Schema;
  setSchema: React.Dispatch<React.SetStateAction<Schema>>;
  isOpen: boolean;
  onClose: () => void;
  onRecordChange: (title: string, description: string, type: any) => void;
}

export const SqlModal: React.FC<SqlModalProps> = ({
  schema,
  setSchema,
  isOpen,
  onClose,
  onRecordChange,
}) => {
  if (!isOpen) return null;

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'export' | 'importDdl' | 'seed' | 'aiGen' | 'migrations' | 'formats'>('export');
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Tab 1: Export DDL State
  const [exportDialect, setExportDialect] = useState<SqlDialect>(schema.dialect || 'PostgreSQL');
  const [includeDropTable, setIncludeDropTable] = useState(true);
  const [includeIfNotExists, setIncludeIfNotExists] = useState(true);
  const [includeForeignKeys, setIncludeForeignKeys] = useState(true);
  const [foreignKeyStyle, setForeignKeyStyle] = useState<'alter' | 'inline'>('alter');
  const [includeIndexes, setIncludeIndexes] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [schemaPrefix, setSchemaPrefix] = useState('');
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>('all');

  // Tab 2: Import DDL State
  const [importDdlText, setImportDdlText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importError, setImportError] = useState<string | null>(null);

  // Tab 3: Seed Data State
  const [seedDialect, setSeedDialect] = useState<SqlDialect>(schema.dialect || 'PostgreSQL');
  const [seedRowCount, setSeedRowCount] = useState<number>(5);

  // Tab 4: AI & Query to Schema State
  const [aiSubTab, setAiSubTab] = useState<'query' | 'prompt'>('prompt');
  const [aiPromptText, setAiPromptText] = useState(
    'Сервис бронирования отелей: гостиницы, типы номеров, комнаты, клиенты, бронирования, платежи и отзывы'
  );
  const [queryInput, setQueryInput] = useState(
    `SELECT 
    u.id AS user_id,
    u.email,
    u.full_name,
    o.id AS order_id,
    o.order_number,
    o.total_amount,
    p.id AS payment_id,
    p.payment_method,
    p.status AS payment_status
FROM users u
INNER JOIN orders o ON o.user_id = u.id
LEFT JOIN payments p ON p.order_id = o.id
WHERE o.created_at >= '2026-01-01';`
  );
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResultPreview, setAiResultPreview] = useState<{
    tables: Table[];
    relationships: Relationship[];
    source?: string;
  } | null>(null);

  // Tab 5: Migrations State
  const [migrationDialect, setMigrationDialect] = useState<SqlDialect>(schema.dialect || 'PostgreSQL');
  const [migrationTab, setMigrationTab] = useState<'up' | 'down'>('up');

  // Tab 6: Formats State
  const [formatType, setFormatType] = useState<'mermaid' | 'dbml' | 'json'>('mermaid');
  const [jsonImportText, setJsonImportText] = useState('');

  // Notifications helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Generated DDL SQL
  const exportedSql = useMemo(() => {
    const options: SqlExportOptions = {
      dialect: exportDialect,
      includeDropTable,
      includeIfNotExists,
      includeForeignKeys,
      foreignKeyStyle,
      includeIndexes,
      includeComments,
      includeSchemaPrefix: schemaPrefix.trim() || undefined,
      selectedTableId: selectedTableFilter === 'all' ? undefined : selectedTableFilter,
    };
    return generateSql(schema, options);
  }, [
    schema,
    exportDialect,
    includeDropTable,
    includeIfNotExists,
    includeForeignKeys,
    foreignKeyStyle,
    includeIndexes,
    includeComments,
    schemaPrefix,
    selectedTableFilter,
  ]);

  // 2. Generated Seed SQL
  const seedSql = useMemo(() => {
    return generateSeedDataSql(schema, seedDialect, seedRowCount);
  }, [schema, seedDialect, seedRowCount]);

  // 3. Generated Migrations
  const migrationData = useMemo(() => {
    return generateMigrationScript(schema, migrationDialect);
  }, [schema, migrationDialect]);

  // 4. Formats Data
  const mermaidEr = useMemo(() => generateMermaidErDiagram(schema), [schema]);
  const dbmlCode = useMemo(() => generateDbml(schema), [schema]);
  const jsonSchemaText = useMemo(() => JSON.stringify(schema, null, 2), [schema]);

  // Parsed DDL Preview in Tab 2
  const parsedDdlPreview = useMemo(() => {
    if (!importDdlText.trim()) return null;
    try {
      const res = parseSqlDdl(importDdlText);
      return res;
    } catch {
      return null;
    }
  }, [importDdlText]);

  // Handlers for Import DDL
  const handleApplyImportDdl = () => {
    if (!importDdlText.trim()) {
      setImportError('Введите SQL DDL скрипт для импорта');
      return;
    }

    try {
      const parsed = parseSqlDdl(importDdlText);
      if (parsed.tables.length === 0) {
        setImportError('Не удалось обнаружить операторы CREATE TABLE. Проверьте синтаксис.');
        return;
      }

      setImportError(null);

      if (importMode === 'replace') {
        setSchema((prev) => ({
          ...prev,
          tables: parsed.tables,
          relationships: parsed.relationships,
        }));
        onRecordChange(
          'Импорт DDL (Замена)',
          `Импортировано ${parsed.tables.length} таблиц и ${parsed.relationships.length} связей`,
          'table_created'
        );
      } else {
        // Merge
        setSchema((prev) => {
          const existingNames = new Set(prev.tables.map((t) => t.name.toLowerCase()));
          const newTables = parsed.tables.filter((t) => !existingNames.has(t.name.toLowerCase()));
          return {
            ...prev,
            tables: [...prev.tables, ...newTables],
            relationships: [...prev.relationships, ...parsed.relationships],
          };
        });
        onRecordChange(
          'Импорт DDL (Слияние)',
          `Добавлено ${parsed.tables.length} таблиц`,
          'table_created'
        );
      }

      onClose();
    } catch (err: any) {
      setImportError(`Ошибка парсинга: ${err?.message || 'Некорректный синтаксис DDL'}`);
    }
  };

  // Sample DDL loader for easy testing
  const handleLoadSampleDdl = (type: 'crm' | 'marketplace' | 'fintech') => {
    if (type === 'crm') {
      setImportDdlText(`CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    annual_revenue DECIMAL(14,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contacts (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    position VARCHAR(100)
);

CREATE TABLE deals (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id),
    title VARCHAR(255) NOT NULL,
    stage VARCHAR(50) DEFAULT 'PROSPECTING',
    deal_value DECIMAL(12,2) NOT NULL,
    close_date DATE
);`);
    } else if (type === 'marketplace') {
      setImportDdlText(`CREATE TABLE vendors (
    id BIGSERIAL PRIMARY KEY,
    store_name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(255) UNIQUE NOT NULL,
    rating DECIMAL(3,2) DEFAULT 5.00,
    verified BOOLEAN DEFAULT true
);

CREATE TABLE items (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    item_title VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    inventory_count INT DEFAULT 0
);

CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    score INT NOT NULL,
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`);
    } else {
      setImportDdlText(`CREATE TABLE wallets (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    balance DECIMAL(16,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    tx_type VARCHAR(20) NOT NULL,
    amount DECIMAL(16,2) NOT NULL,
    tx_hash VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`);
    }
  };

  // AI Prompt to Schema Handler
  const handleGenerateFromPrompt = async () => {
    if (!aiPromptText.trim()) return;
    setIsGeneratingAi(true);

    try {
      const res = await fetch('/api/gemini/generate-schema-from-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPromptText,
          targetDialect: schema.dialect,
        }),
      });
      const data = await res.json();
      if (data.tables && Array.isArray(data.tables)) {
        setAiResultPreview({
          tables: data.tables,
          relationships: data.relationships || [],
          source: data.source || 'AI Архитектор баз данных',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Query to Schema Handler
  const handleInferFromQuery = async () => {
    if (!queryInput.trim()) return;
    setIsGeneratingAi(true);

    try {
      const res = await generateSchemaFromSql(queryInput);
      setAiResultPreview({
        tables: res.tables,
        relationships: res.relationships,
        source: res.inferredSource || 'Анализатор SQL запросов',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplyAiSchema = () => {
    if (!aiResultPreview || aiResultPreview.tables.length === 0) return;

    setSchema((prev) => ({
      ...prev,
      tables: aiResultPreview.tables,
      relationships: aiResultPreview.relationships,
    }));

    onRecordChange(
      'Применена сгенерированная схема',
      `Загружено ${aiResultPreview.tables.length} таблиц (${aiResultPreview.source || 'AI'})`,
      'table_created'
    );
    onClose();
  };

  const handleApplyJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonImportText);
      if (!parsed.tables || !Array.isArray(parsed.tables)) {
        throw new Error('Не найден массив tables');
      }
      setSchema({
        id: parsed.id || `schema_${Date.now()}`,
        name: parsed.name || 'Imported_Schema',
        dialect: parsed.dialect || schema.dialect,
        version: (parsed.version || 1) + 1,
        tables: parsed.tables,
        relationships: parsed.relationships || [],
        shapes: parsed.shapes || [],
        canvasSettings: parsed.canvasSettings || schema.canvasSettings,
      });
      onRecordChange('Импорт схемы из JSON', `Загружено ${parsed.tables.length} таблиц`, 'table_created');
      onClose();
    } catch (e: any) {
      alert(`Ошибка чтения JSON: ${e.message}`);
    }
  };

  const downloadTextFile = (content: string, filename: string, mime: string = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
          isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[92vh]'
        }`}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Центр SQL Интеграции & Экспорта
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-medium">
                  {schema.dialect}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {schema.tables.length} таблиц · {schema.relationships.length} связей
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Генерация DDL, тестовые данные Seed, импорт DDL, AI реконструкция схемы и экспорт в Mermaid / DBML
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullScreen ? 'Оконный режим' : 'Во весь экран'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between px-6 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          <div className="flex items-center gap-1 py-2">
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'export'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileCode className="w-4 h-4" />
              Экспорт DDL
            </button>

            <button
              onClick={() => setActiveTab('importDdl')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'importDdl'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Upload className="w-4 h-4" />
              Импорт DDL
            </button>

            <button
              onClick={() => setActiveTab('seed')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'seed'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Seed Данные (INSERT)
            </button>

            <button
              onClick={() => setActiveTab('aiGen')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'aiGen'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              AI Архитектор & Запросы
            </button>

            <button
              onClick={() => setActiveTab('migrations')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'migrations'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Миграции (V1__init)
            </button>

            <button
              onClick={() => setActiveTab('formats')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'formats'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              Mermaid / DBML / JSON
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Готово к экспорту
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* TAB 1: ЭКСПОРТ DDL */}
          {activeTab === 'export' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Control Sidebar */}
              <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50/70 p-4 overflow-y-auto space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    Целевая СУБД (Диалект)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['PostgreSQL', 'MySQL', 'SQLite', 'MSSQL', 'Oracle'] as SqlDialect[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setExportDialect(d)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                          exportDialect === d
                            ? 'bg-blue-600 border-blue-600 text-white shadow-2xs font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    Фильтр таблиц
                  </label>
                  <select
                    value={selectedTableFilter}
                    onChange={(e) => setSelectedTableFilter(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Экспорт всей схемы ({schema.tables.length} таблиц)</option>
                    {schema.tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Только {t.name} ({t.columns.length} колонок)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    Параметры генерации DDL
                  </label>
                  <div className="space-y-2 text-xs text-slate-700">
                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDropTable}
                        onChange={(e) => setIncludeDropTable(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>DROP TABLE IF EXISTS</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeIfNotExists}
                        onChange={(e) => setIncludeIfNotExists(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>CREATE TABLE IF NOT EXISTS</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeForeignKeys}
                        onChange={(e) => setIncludeForeignKeys(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Внешние ключи (Foreign Keys)</span>
                    </label>

                    {includeForeignKeys && (
                      <div className="pl-6 space-y-1 text-[11px] text-slate-600">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="fkStyle"
                            value="alter"
                            checked={foreignKeyStyle === 'alter'}
                            onChange={() => setForeignKeyStyle('alter')}
                          />
                          ALTER TABLE ADD CONSTRAINT
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="fkStyle"
                            value="inline"
                            checked={foreignKeyStyle === 'inline'}
                            onChange={() => setForeignKeyStyle('inline')}
                          />
                          Внутри CREATE TABLE (Inline)
                        </label>
                      </div>
                    )}

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeIndexes}
                        onChange={(e) => setIncludeIndexes(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>CREATE INDEX для FK и поисковых полей</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeComments}
                        onChange={(e) => setIncludeComments(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Комментарии и описание сущностей</span>
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Префикс схемы / Namespace
                  </label>
                  <input
                    type="text"
                    value={schemaPrefix}
                    onChange={(e) => setSchemaPrefix(e.target.value)}
                    placeholder="public или core_v1"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Code Preview Area */}
              <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-emerald-400">
                      {schema.name.toLowerCase()}_{exportDialect.toLowerCase()}.sql
                    </span>
                    <span className="text-slate-500">|</span>
                    <span>{exportedSql.split('\n').length} строк DDL</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(exportedSql)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Скопировано!' : 'Копировать SQL'}
                    </button>
                    <button
                      onClick={() =>
                        downloadTextFile(
                          exportedSql,
                          `${schema.name.toLowerCase()}_${exportDialect.toLowerCase()}.sql`
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать .sql
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed selection:bg-blue-600 selection:text-white">
                  <pre>{exportedSql}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ИМПОРТ DDL */}
          {activeTab === 'importDdl' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Вставьте SQL DDL скрипт для обратного инжиниринга
                    </h3>
                    <p className="text-xs text-slate-500">
                      Поддерживаются операторы CREATE TABLE, PRIMARY KEY, FOREIGN KEY, REFERENCES, UNIQUE, DEFAULT
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Примеры:</span>
                    <button
                      onClick={() => handleLoadSampleDdl('crm')}
                      className="px-2.5 py-1 text-xs rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
                    >
                      CRM DDL
                    </button>
                    <button
                      onClick={() => handleLoadSampleDdl('marketplace')}
                      className="px-2.5 py-1 text-xs rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
                    >
                      Маркетплейс
                    </button>
                    <button
                      onClick={() => handleLoadSampleDdl('fintech')}
                      className="px-2.5 py-1 text-xs rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
                    >
                      Финтех
                    </button>
                  </div>
                </div>

                {importError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                <textarea
                  value={importDdlText}
                  onChange={(e) => setImportDdlText(e.target.value)}
                  placeholder="CREATE TABLE users (&#10;    id BIGSERIAL PRIMARY KEY,&#10;    username VARCHAR(100) NOT NULL UNIQUE,&#10;    email VARCHAR(255) NOT NULL,&#10;    created_at TIMESTAMPTZ DEFAULT NOW()&#10;);&#10;&#10;CREATE TABLE orders (&#10;    id BIGSERIAL PRIMARY KEY,&#10;    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,&#10;    amount DECIMAL(10,2) NOT NULL&#10;);"
                  className="flex-1 w-full p-4 font-mono text-xs bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-semibold text-slate-700">Режим импорта:</span>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                      />
                      Заменить текущую схему
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                      />
                      Объединить со схемой
                    </label>
                  </div>

                  <button
                    onClick={handleApplyImportDdl}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Импортировать в холст
                  </button>
                </div>
              </div>

              {/* Live AST Preview Sidebar */}
              <div className="w-full md:w-80 border-l border-slate-200 bg-white p-4 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    AST Анализатор синтаксиса
                  </h4>
                  {parsedDdlPreview && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      Найдено: {parsedDdlPreview.tables.length} табл.
                    </span>
                  )}
                </div>

                {!parsedDdlPreview || parsedDdlPreview.tables.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Вставьте SQL код слева для предварительного анализа структуры
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-600">
                      Распознано таблиц: <span className="font-bold text-slate-900">{parsedDdlPreview.tables.length}</span>,
                      связей: <span className="font-bold text-slate-900">{parsedDdlPreview.relationships.length}</span>
                    </div>

                    <div className="space-y-2">
                      {parsedDdlPreview.tables.map((t) => (
                        <div key={t.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900">{t.name}</span>
                            <span className="text-[10px] text-slate-500">{t.columns.length} колонок</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {t.columns.map((c) => (
                              <span
                                key={c.id}
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  c.isPk
                                    ? 'bg-amber-100 text-amber-800 font-semibold'
                                    : c.isFk
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-white text-slate-600 border border-slate-200'
                                }`}
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {parsedDdlPreview.relationships.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Обнаруженные Foreign Keys
                        </span>
                        <div className="space-y-1">
                          {parsedDdlPreview.relationships.map((r) => (
                            <div key={r.id} className="text-[11px] text-slate-600 flex items-center gap-1.5 font-mono">
                              <span className="text-blue-600">{r.sourceTableId.replace('tbl_', '')}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="text-purple-600">{r.targetTableId.replace('tbl_', '')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SEED MOCK ДАННЫЕ (INSERT) */}
          {activeTab === 'seed' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    СУБД для INSERT скрипта
                  </label>
                  <select
                    value={seedDialect}
                    onChange={(e) => setSeedDialect(e.target.value as SqlDialect)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="MySQL">MySQL</option>
                    <option value="SQLite">SQLite</option>
                    <option value="MSSQL">MSSQL (T-SQL)</option>
                    <option value="Oracle">Oracle</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    Количество строк на таблицу
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 5, 10, 25].map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => setSeedRowCount(cnt)}
                        className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                          seedRowCount === cnt
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Целостность связей
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900/80">
                    Генератор автоматически выполняет топологическую сортировку схемы: родительские таблицы заполняются
                    первыми, а дочерние таблицы используют сгенерированные идентификаторы для корректных внешних ключей.
                  </p>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-emerald-400">seed_data_{seedDialect.toLowerCase()}.sql</span>
                    <span className="text-slate-500">|</span>
                    <span>{seedRowCount * schema.tables.length} INSERT записей</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(seedSql)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Скопировано!' : 'Копировать INSERT'}
                    </button>
                    <button
                      onClick={() =>
                        downloadTextFile(seedSql, `seed_data_${schema.name.toLowerCase()}.sql`)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать .sql
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed selection:bg-blue-600 selection:text-white">
                  <pre>{seedSql}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI АРХИТЕКТОР & ЗАПРОСЫ */}
          {activeTab === 'aiGen' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
              <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    onClick={() => setAiSubTab('prompt')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      aiSubTab === 'prompt'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    1. Архитектура по описанию (Prompt to Schema)
                  </button>
                  <button
                    onClick={() => setAiSubTab('query')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      aiSubTab === 'query'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    2. Реконструкция из SQL запросов (SELECT / JOIN)
                  </button>
                </div>

                {aiSubTab === 'prompt' ? (
                  <div className="flex-1 flex flex-col space-y-2">
                    <label className="text-xs font-bold text-slate-700">
                      Опишите предметную область системы:
                    </label>
                    <textarea
                      value={aiPromptText}
                      onChange={(e) => setAiPromptText(e.target.value)}
                      placeholder="Например: Платформа аренды самокатов: пользователи, самокаты, поездки, тарифы, гео-зоны парковки, транзакции и промокоды"
                      className="flex-1 w-full p-3 font-sans text-xs bg-white text-slate-900 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none shadow-inner"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Примеры:</span>
                        <button
                          onClick={() =>
                            setAiPromptText(
                              'Служба доставки еды: рестораны, меню, блюда, клиенты, заказы, курьеры, статусы и транзакции'
                            )
                          }
                          className="text-[11px] px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-medium"
                        >
                          Доставка еды
                        </button>
                        <button
                          onClick={() =>
                            setAiPromptText(
                              'Система медицинского центра: пациенты, врачи, специальности, приемы, диагнозы, назначения и счета'
                            )
                          }
                          className="text-[11px] px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-medium"
                        >
                          Клиника
                        </button>
                      </div>

                      <button
                        onClick={handleGenerateFromPrompt}
                        disabled={isGeneratingAi}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        {isGeneratingAi ? 'Генерация структуры...' : 'Спроектировать схему AI'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col space-y-2">
                    <label className="text-xs font-bold text-slate-700">
                      Вставьте SQL запросы приложения с JOIN-выборками:
                    </label>
                    <textarea
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      placeholder="SELECT u.id, u.email, o.order_number FROM users u JOIN orders o ON o.user_id = u.id..."
                      className="flex-1 w-full p-3 font-mono text-xs bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex items-center justify-end pt-1">
                      <button
                        onClick={handleInferFromQuery}
                        disabled={isGeneratingAi}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white text-xs font-bold transition-all shadow-md"
                      >
                        <Terminal className="w-4 h-4" />
                        {isGeneratingAi ? 'Анализ запроса...' : 'Реконструировать схему'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Result Preview Sidebar */}
              <div className="w-full md:w-96 border-l border-slate-200 bg-white p-4 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Результат моделирования
                  </h4>
                  {aiResultPreview && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      {aiResultPreview.tables.length} таблиц
                    </span>
                  )}
                </div>

                {!aiResultPreview ? (
                  <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>Нажмите «Спроектировать схему AI» для автоматического создания структуры</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-[11px] p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
                      <span>Источник: {aiResultPreview.source || 'AI Архитектор'}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>

                    <div className="space-y-2">
                      {aiResultPreview.tables.map((t) => (
                        <div key={t.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900">{t.name}</span>
                            <span className="text-[10px] text-slate-500">{t.columns.length} колонок</span>
                          </div>
                          {t.comment && <p className="text-[11px] text-slate-500 mb-1.5">{t.comment}</p>}
                          <div className="flex flex-wrap gap-1">
                            {t.columns.map((c) => (
                              <span
                                key={c.id}
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  c.isPk
                                    ? 'bg-amber-100 text-amber-800 font-semibold'
                                    : c.isFk
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-white text-slate-600 border border-slate-200'
                                }`}
                              >
                                {c.name}: {c.type}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleApplyAiSchema}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 mt-4"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Загрузить готовую схему на холст
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: МИГРАЦИИ (FLYWAY / LIQUIBASE) */}
          {activeTab === 'migrations' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    Диалект миграции
                  </label>
                  <select
                    value={migrationDialect}
                    onChange={(e) => setMigrationDialect(e.target.value as SqlDialect)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
                  >
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="MySQL">MySQL</option>
                    <option value="SQLite">SQLite</option>
                    <option value="MSSQL">MSSQL</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    Файл миграции
                  </label>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 break-all">
                    {migrationData.filename}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-200 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setMigrationTab('up')}
                      className={`flex-1 py-1.5 rounded-md transition-all ${
                        migrationTab === 'up' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      UP (Накат)
                    </button>
                    <button
                      onClick={() => setMigrationTab('down')}
                      className={`flex-1 py-1.5 rounded-md transition-all ${
                        migrationTab === 'down' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      DOWN (Откат)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-mono text-emerald-400">
                    {migrationTab === 'up' ? migrationData.filename : `rollback_${migrationData.filename}`}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(migrationTab === 'up' ? migrationData.upSql : migrationData.downSql)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Копировать
                    </button>
                    <button
                      onClick={() =>
                        downloadTextFile(
                          migrationTab === 'up' ? migrationData.upSql : migrationData.downSql,
                          migrationTab === 'up' ? migrationData.filename : `rollback_${migrationData.filename}`
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
                  <pre>{migrationTab === 'up' ? migrationData.upSql : migrationData.downSql}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MERMAID / DBML / JSON */}
          {activeTab === 'formats' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    Формат схемы
                  </label>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setFormatType('mermaid')}
                      className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-all ${
                        formatType === 'mermaid'
                          ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>Mermaid ER Diagram</span>
                      <span className="text-[10px] opacity-75">Markdown / Notion</span>
                    </button>

                    <button
                      onClick={() => setFormatType('dbml')}
                      className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-all ${
                        formatType === 'dbml'
                          ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>DBML (Database Markup)</span>
                      <span className="text-[10px] opacity-75">dbdocs.io</span>
                    </button>

                    <button
                      onClick={() => setFormatType('json')}
                      className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-all ${
                        formatType === 'json'
                          ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>DataSchema Studio JSON</span>
                      <span className="text-[10px] opacity-75">Полный бэкап</span>
                    </button>
                  </div>
                </div>

                {formatType === 'json' && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Импорт из JSON бэкапа
                    </label>
                    <textarea
                      value={jsonImportText}
                      onChange={(e) => setJsonImportText(e.target.value)}
                      placeholder="Вставьте JSON файл схемы..."
                      className="w-full h-32 p-2 text-[11px] font-mono bg-white border border-slate-300 rounded-lg resize-none"
                    />
                    <button
                      onClick={handleApplyJsonImport}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
                    >
                      Применить JSON
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-mono text-emerald-400">
                    {formatType === 'mermaid'
                      ? 'diagram.mermaid'
                      : formatType === 'dbml'
                      ? 'schema.dbml'
                      : 'schema.json'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleCopy(
                          formatType === 'mermaid'
                            ? mermaidEr
                            : formatType === 'dbml'
                            ? dbmlCode
                            : jsonSchemaText
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Копировать
                    </button>
                    <button
                      onClick={() =>
                        downloadTextFile(
                          formatType === 'mermaid'
                            ? mermaidEr
                            : formatType === 'dbml'
                            ? dbmlCode
                            : jsonSchemaText,
                          `${schema.name.toLowerCase()}.${
                            formatType === 'mermaid' ? 'mermaid' : formatType === 'dbml' ? 'dbml' : 'json'
                          }`
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
                  <pre>
                    {formatType === 'mermaid'
                      ? mermaidEr
                      : formatType === 'dbml'
                      ? dbmlCode
                      : jsonSchemaText}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
