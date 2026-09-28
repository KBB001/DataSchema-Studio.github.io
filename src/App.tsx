import React, { useState, useEffect } from 'react';
import { Schema, Table, Relationship, SqlDialect, UserPermission, ChangeNotification } from './types';
import { initialSchema, SCHEMA_TEMPLATES, initialUsers } from './data/initialSchema';
import {
  loadSchemaFromStorage,
  saveSchemaToStorage,
  clearDiagramStorage,
} from './utils/diagramStorage';
import { Navbar } from './components/Navbar';
import { DiagramCanvas } from './components/DiagramCanvas';
import { TableEditModal } from './components/TableEditModal';
import { RelationModal } from './components/RelationModal';
import { SqlModal } from './components/SqlModal';
import { SqlStudioModal } from './components/SqlStudioModal';
import { GitHubModal } from './components/GitHubModal';
import { AccessManagementPage } from './components/AccessManagementPage';
import { HandbookAndDebugTool } from './components/HandbookAndDebugTool';
import { NotificationsModal } from './components/NotificationsModal';
import { CheckCircle2, RotateCcw, Trash2, Cloud, Database } from 'lucide-react';

export default function App() {
  // Main Navigation State
  const [currentTab, setCurrentTab] = useState<'canvas' | 'access' | 'handbook' | 'sqlStudio'>('canvas');

  // Database Schema State initialized from localStorage & cookies if available
  const [schema, setSchema] = useState<Schema>(() => {
    const saved = loadSchemaFromStorage();
    if (saved && Array.isArray(saved.tables)) {
      return saved;
    }
    return initialSchema;
  });
  const [dialect, setDialect] = useState<SqlDialect>(() => {
    const saved = loadSchemaFromStorage();
    return saved?.dialect || initialSchema.dialect;
  });

  // Autosave status state
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    const saved = loadSchemaFromStorage();
    return saved ? 'Восстановлено из памяти' : null;
  });
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save effect: automatically stores schema into localStorage and cookies
  useEffect(() => {
    setIsSaving(true);
    const timer = setTimeout(() => {
      saveSchemaToStorage(schema);
      setIsSaving(false);
      const timeStr = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSavedTime(timeStr);
    }, 400);

    return () => clearTimeout(timer);
  }, [schema]);

  // Users & Permissions State
  const [users, setUsers] = useState<UserPermission[]>(initialUsers as UserPermission[]);

  // Project Notifications State
  const [notifications, setNotifications] = useState<ChangeNotification[]>([
    {
      id: 'n-1',
      title: 'Инициализация схемы',
      description: 'Загружен шаблон архитектуры Ecommerce_Core_DB с 6 таблицами',
      timestamp: 'Только что',
      author: 'Система',
      type: 'table_created',
      read: false,
    },
    {
      id: 'n-2',
      title: 'Связь внешних ключей',
      description: 'Установлены ограничения целостности orders.user_id → users.id',
      timestamp: '5 минут назад',
      author: 'Бекжан Кенесбек',
      type: 'relation_created',
      read: true,
    },
  ]);

  // Modals visibility state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);

  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const recordChange = (
    title: string,
    description: string,
    type: ChangeNotification['type']
  ) => {
    const newNotif: ChangeNotification = {
      id: `notif_${Date.now()}`,
      title,
      description,
      timestamp: 'Только что',
      author: 'Бекжан Кенесбек',
      type,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Show temporary toast
    setToastMessage(title);
    setTimeout(() => {
      setToastMessage((cur) => (cur === title ? null : cur));
    }, 3000);
  };

  // Dialect sync
  const handleSetDialect = (newDialect: SqlDialect) => {
    setDialect(newDialect);
    setSchema((prev) => ({ ...prev, dialect: newDialect }));
    recordChange('Смена целевой СУБД', `Диалект изменен на ${newDialect}`, 'table_updated');
  };

  // Table Add / Edit / Delete Handlers
  const handleOpenAddTableModal = () => {
    const newTable: Table = {
      id: `tbl_${Date.now()}`,
      name: `new_table_${schema.tables.length + 1}`,
      comment: '',
      x: 100 + (schema.tables.length % 3) * 60,
      y: 100 + (schema.tables.length % 3) * 60,
      color: '#3b82f6',
      columns: [
        {
          id: `col_id_${Date.now()}`,
          name: 'id',
          type: 'BIGSERIAL',
          isPk: true,
          isFk: false,
          isNullable: false,
          isUnique: true,
          comment: 'Первичный ключ',
        },
        {
          id: `col_created_${Date.now()}`,
          name: 'created_at',
          type: 'TIMESTAMPTZ',
          isPk: false,
          isFk: false,
          isNullable: false,
          isUnique: false,
          defaultValue: 'NOW()',
        },
      ],
    };
    setEditingTable(newTable);
    setIsTableModalOpen(true);
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setIsTableModalOpen(true);
  };

  const handleSaveTable = (updatedTable: Table) => {
    const exists = schema.tables.some((t) => t.id === updatedTable.id);
    if (exists) {
      setSchema((prev) => ({
        ...prev,
        tables: prev.tables.map((t) => (t.id === updatedTable.id ? updatedTable : t)),
        version: prev.version + 1,
      }));
      recordChange(
        'Таблица обновлена',
        `Изменена структура таблицы ${updatedTable.name} (${updatedTable.columns.length} колонок)`,
        'table_updated'
      );
    } else {
      setSchema((prev) => ({
        ...prev,
        tables: [...prev.tables, updatedTable],
        version: prev.version + 1,
      }));
      recordChange(
        'Создана новая таблица',
        `Таблица ${updatedTable.name} добавлена в схему`,
        'table_created'
      );
    }
  };

  const handleDeleteTable = (tableId: string) => {
    const table = schema.tables.find((t) => t.id === tableId);
    setSchema((prev) => ({
      ...prev,
      tables: prev.tables.filter((t) => t.id !== tableId),
      // Clean up connected relationships
      relationships: prev.relationships.filter(
        (r) => r.sourceTableId !== tableId && r.targetTableId !== tableId
      ),
      version: prev.version + 1,
    }));
    recordChange('Удалена таблица', `Таблица ${table?.name || tableId} удалена из архитектуры`, 'table_deleted');
  };

  const handleAddColumnToTable = (tableId: string) => {
    const target = schema.tables.find((t) => t.id === tableId);
    if (!target) return;

    setEditingTable(target);
    setIsTableModalOpen(true);
  };

  // Relationship Handlers
  const handleSelectRelationship = (rel: Relationship) => {
    setSelectedRelationship(rel);
    setIsRelationModalOpen(true);
  };

  const handleSaveRelationship = (updatedRel: Relationship) => {
    setSchema((prev) => ({
      ...prev,
      relationships: prev.relationships.map((r) => (r.id === updatedRel.id ? updatedRel : r)),
      version: prev.version + 1,
    }));
    recordChange('Обновлена связь FK', `Параметры связи ${updatedRel.name || updatedRel.id} обновлены`, 'table_updated');
  };

  const handleDeleteRelationship = (relId: string) => {
    setSchema((prev) => ({
      ...prev,
      relationships: prev.relationships.filter((r) => r.id !== relId),
      version: prev.version + 1,
    }));
    recordChange('Удалена связь FK', `Внешний ключ удален`, 'relation_deleted');
  };

  // Canvas clear and reset handlers
  const handleClearCanvas = () => {
    const emptySchema: Schema = {
      ...schema,
      tables: [],
      relationships: [],
      shapes: [],
      version: schema.version + 1,
    };
    setSchema(emptySchema);
    saveSchemaToStorage(emptySchema);
    recordChange('Очистка холста', 'Все таблицы и связи были удалены с холста', 'table_deleted');
  };

  const handleResetToDemo = (template = SCHEMA_TEMPLATES[0]) => {
    clearDiagramStorage();
    setSchema(template.schema);
    setDialect(template.schema.dialect);
    saveSchemaToStorage(template.schema);
    recordChange('Сброс схемы', `Схема восстановлена к шаблону "${template.name}"`, 'table_created');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        dialect={dialect}
        setDialect={handleSetDialect}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onOpenAddTableModal={handleOpenAddTableModal}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadCount}
        tablesCount={schema.tables.length}
        relationsCount={schema.relationships.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {currentTab === 'canvas' && (
          <div className="relative w-full h-full">
            {/* Top Right: Autosave status & Template preset switcher */}
            <div className="absolute top-3 right-3 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
              {/* Autosave badge with cookie & site storage indicator */}
              <div
                className="flex items-center gap-2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs"
                title="Автосохранение данных активно: вся диаграмма, таблицы, связи и настройки сохраняются в cookies и хранилище браузера"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                  <Cloud className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold text-slate-800">
                    {isSaving ? 'Сохранение...' : 'Автосохранение: Cookie & Данные сайта'}
                  </span>
                </div>
                {lastSavedTime && (
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    ({lastSavedTime})
                  </span>
                )}
              </div>

              {/* Template preset switcher */}
              <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-slate-200 text-xs">
                <span className="text-slate-400 font-medium px-2 hidden lg:inline">Шаблон:</span>
                {SCHEMA_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setSchema(tpl.schema);
                      recordChange('Смена шаблона архитектуры', `Загружен шаблон "${tpl.name}"`, 'table_created');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      schema.name === tpl.schema.name
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            <DiagramCanvas
              schema={schema}
              setSchema={setSchema}
              onEditTable={handleEditTable}
              onDeleteTable={handleDeleteTable}
              onAddColumn={handleAddColumnToTable}
              onOpenAddTableModal={handleOpenAddTableModal}
              onRecordChange={recordChange}
              onSelectRelationship={handleSelectRelationship}
              onClearCanvas={handleClearCanvas}
              onResetToDemo={() => handleResetToDemo()}
              isSaving={isSaving}
              lastSavedTime={lastSavedTime}
            />
          </div>
        )}

        {currentTab === 'access' && (
          <AccessManagementPage
            users={users}
            setUsers={setUsers}
            onRecordChange={recordChange}
          />
        )}

        {currentTab === 'handbook' && (
          <HandbookAndDebugTool
            schema={schema}
            onRecordChange={recordChange}
          />
        )}

        {currentTab === 'sqlStudio' && (
          <SqlStudioModal
            schema={schema}
            onRecordChange={recordChange}
          />
        )}
      </main>

      {/* Real-time Change Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Table Edit / Add Modal */}
      <TableEditModal
        table={editingTable}
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onSave={handleSaveTable}
      />

      {/* Foreign Key Relation Modal */}
      <RelationModal
        relationship={selectedRelationship}
        schema={schema}
        isOpen={isRelationModalOpen}
        onClose={() => setIsRelationModalOpen(false)}
        onSave={handleSaveRelationship}
        onDelete={handleDeleteRelationship}
      />

      {/* SQL Import / Export & Query-to-Schema Modal */}
      <SqlModal
        schema={schema}
        setSchema={setSchema}
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        onRecordChange={recordChange}
      />

      {/* GitHub Version Control Modal */}
      <GitHubModal
        schema={schema}
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onRecordChange={recordChange}
      />

      {/* Notifications Drawer/Modal */}
      <NotificationsModal
        notifications={notifications}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onMarkAllAsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onClearAll={() => setNotifications([])}
      />
    </div>
  );
}
