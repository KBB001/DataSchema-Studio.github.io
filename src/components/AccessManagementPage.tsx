import React, { useState } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Key,
  ShieldAlert,
  Sliders,
  Check
} from 'lucide-react';
import { UserPermission, UserRole } from '../types';

interface AccessManagementPageProps {
  users: UserPermission[];
  setUsers: React.Dispatch<React.SetStateAction<UserPermission[]>>;
  onRecordChange: (title: string, description: string, type: any) => void;
}

const ROLES: UserRole[] = [
  'Super Admin',
  'Database Architect',
  'Schema Editor',
  'Read-Only Analyst',
  'DevOps / Auditor',
];

export const AccessManagementPage: React.FC<AccessManagementPageProps> = ({
  users,
  setUsers,
  onRecordChange,
}) => {
  const [selectedUser, setSelectedUser] = useState<UserPermission | null>(users[0] || null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Schema Editor');

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = {
            ...u,
            role: newRole,
            permissions: {
              ...u.permissions,
              canEditSchema: ['Super Admin', 'Database Architect', 'Schema Editor'].includes(newRole),
              canDropTables: newRole === 'Super Admin',
              canCommitGit: ['Super Admin', 'Database Architect'].includes(newRole),
              canManageAccess: newRole === 'Super Admin',
            },
          };
          if (selectedUser?.id === userId) setSelectedUser(updated);
          return updated;
        }
        return u;
      })
    );
    onRecordChange('Изменение роли пользователя', `Пользователю назначен уровень: ${newRole}`, 'table_updated');
  };

  const handleTogglePermission = (userId: string, permKey: keyof UserPermission['permissions']) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = {
            ...u,
            permissions: {
              ...u.permissions,
              [permKey]: !u.permissions[permKey],
            },
          };
          if (selectedUser?.id === userId) setSelectedUser(updated);
          return updated;
        }
        return u;
      })
    );
    onRecordChange('Изменение прав доступа', `Обновлены разрешения для пользователя`, 'table_updated');
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newUser: UserPermission = {
      id: `u-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80`,
      status: 'active',
      permissions: {
        canEditSchema: ['Super Admin', 'Database Architect', 'Schema Editor'].includes(newUserRole),
        canDropTables: newUserRole === 'Super Admin',
        canExecuteQueries: true,
        canExportSql: true,
        canCommitGit: ['Super Admin', 'Database Architect'].includes(newUserRole),
        canManageAccess: newUserRole === 'Super Admin',
        canViewAudit: ['Super Admin', 'DevOps / Auditor'].includes(newUserRole),
      },
      lastActive: 'Только что добавлен',
    };

    setUsers([...users, newUser]);
    setSelectedUser(newUser);
    onRecordChange('Приглашен новый пользователь', `${newUser.name} (${newUser.email}) - ${newUser.role}`, 'table_created');

    setNewUserName('');
    setNewUserEmail('');
    setIsInviteOpen(false);
  };

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] bg-slate-100 p-6 overflow-y-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Управление доступом и правами пользователей (RBAC)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Индивидуальная настройка ролей, гранулярных разрешений на модификацию схемы БД, выполнение запросов и Git-миграции
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Пригласить коллегу</span>
        </button>
      </div>

      {/* Main Grid: Users list + Granular permissions matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List Column */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Команда проекта ({users.length})
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">Все активны</span>
          </div>

          <div className="space-y-1.5">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedUser?.id === user.id
                    ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 text-xs truncate">{user.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-700">
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions & Roles Detail Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedUser ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Selected User Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
                  />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{selectedUser.name}</h2>
                    <p className="text-xs text-slate-500">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedUser.lastActive}</span>
                    </div>
                  </div>
                </div>

                {/* Role Switcher */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Назначенная роль:</label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => handleRoleChange(selectedUser.id, e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Granular Permissions Matrix */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Индивидуальная матрица привилегий</h3>
                    <p className="text-xs text-slate-500">
                      Точечное включение и отключение операций для пользователя
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Permission 1: Edit Schema */}
                  <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-900">Редактирование таблиц & колонок</div>
                      <div className="text-[11px] text-slate-500">Создание, модификация типов данных и связей</div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission(selectedUser.id, 'canEditSchema')}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        selectedUser.permissions.canEditSchema ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {/* Permission 2: Drop Tables */}
                  <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-semibold text-rose-700 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Удаление таблиц (DROP TABLE)</span>
                      </div>
                      <div className="text-[11px] text-slate-500">Критическая деструктивная операция</div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission(selectedUser.id, 'canDropTables')}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        selectedUser.permissions.canDropTables ? 'bg-rose-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {/* Permission 3: Run Queries */}
                  <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-900">Выполнение SQL через API</div>
                      <div className="text-[11px] text-slate-500">Запуск интерактивных запросов в SQL Studio</div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission(selectedUser.id, 'canExecuteQueries')}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        selectedUser.permissions.canExecuteQueries ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {/* Permission 4: Export SQL/JSON */}
                  <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-900">Экспорт DDL и JSON</div>
                      <div className="text-[11px] text-slate-500">Выгрузка артефактов и DDL скриптов схемы</div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission(selectedUser.id, 'canExportSql')}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        selectedUser.permissions.canExportSql ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {/* Permission 5: Commit to Git */}
                  <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-900">Коммиты в GitHub (Push)</div>
                      <div className="text-[11px] text-slate-500">Создание версий миграций в репозитории</div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission(selectedUser.id, 'canCommitGit')}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        selectedUser.permissions.canCommitGit ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {/* Permission 6: Manage Access */}
                  <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-900">Администрирование пользователей</div>
                      <div className="text-[11px] text-slate-500">Приглашение участников и смена ролей</div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission(selectedUser.id, 'canManageAccess')}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        selectedUser.permissions.canManageAccess ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Выберите пользователя для настройки параметров доступа
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Пригласить нового пользователя</h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-700">Имя и фамилия</label>
                <input
                  type="text"
                  required
                  value={newUserName || ''}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Рабочий Email</label>
                <input
                  type="email"
                  required
                  value={newUserEmail || ''}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="ivan.dev@company.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Роль в проекте</label>
                <select
                  value={newUserRole || 'Developer'}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Отправить приглашение
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
