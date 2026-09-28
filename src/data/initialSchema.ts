import { Schema } from '../types';

export const initialSchema: Schema = {
  id: 'schema_store_prod',
  name: 'Ecommerce_Core_DB',
  dialect: 'PostgreSQL',
  version: 1,
  tables: [
    {
      id: 'tbl_users',
      name: 'users',
      comment: 'Аккаунты клиентов и администраторов системы',
      x: 60,
      y: 80,
      color: '#3b82f6', // blue
      columns: [
        { id: 'u_id', name: 'id', type: 'BIGSERIAL', isPk: true, isFk: false, isNullable: false, isUnique: true, comment: 'Первичный ключ' },
        { id: 'u_email', name: 'email', type: 'VARCHAR', lengthOrPrecision: '255', isPk: false, isFk: false, isNullable: false, isUnique: true, isIndexed: true },
        { id: 'u_hash', name: 'password_hash', type: 'VARCHAR', lengthOrPrecision: '255', isPk: false, isFk: false, isNullable: false, isUnique: false },
        { id: 'u_name', name: 'full_name', type: 'VARCHAR', lengthOrPrecision: '100', isPk: false, isFk: false, isNullable: false, isUnique: false },
        { id: 'u_role', name: 'role', type: 'ENUM', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: "'customer'" },
        { id: 'u_is_active', name: 'is_active', type: 'BOOLEAN', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: 'true' },
        { id: 'u_created_at', name: 'created_at', type: 'TIMESTAMPTZ', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: 'NOW()' }
      ]
    },
    {
      id: 'tbl_categories',
      name: 'categories',
      comment: 'Иерархический каталог товарных групп',
      x: 820,
      y: 60,
      color: '#10b981', // emerald
      columns: [
        { id: 'cat_id', name: 'id', type: 'SERIAL', isPk: true, isFk: false, isNullable: false, isUnique: true },
        { id: 'cat_parent_id', name: 'parent_id', type: 'INT', isPk: false, isFk: true, isNullable: true, isUnique: false, comment: 'Self-reference для подкатегорий' },
        { id: 'cat_name', name: 'name', type: 'VARCHAR', lengthOrPrecision: '100', isPk: false, isFk: false, isNullable: false, isUnique: true },
        { id: 'cat_slug', name: 'slug', type: 'VARCHAR', lengthOrPrecision: '120', isPk: false, isFk: false, isNullable: false, isUnique: true, isIndexed: true },
        { id: 'cat_is_published', name: 'is_published', type: 'BOOLEAN', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: 'true' }
      ]
    },
    {
      id: 'tbl_products',
      name: 'products',
      comment: 'Каталог физических и цифровых товаров',
      x: 820,
      y: 340,
      color: '#06b6d4', // cyan
      columns: [
        { id: 'p_id', name: 'id', type: 'BIGSERIAL', isPk: true, isFk: false, isNullable: false, isUnique: true },
        { id: 'p_category_id', name: 'category_id', type: 'INT', isPk: false, isFk: true, isNullable: false, isUnique: false, isIndexed: true },
        { id: 'p_sku', name: 'sku', type: 'VARCHAR', lengthOrPrecision: '64', isPk: false, isFk: false, isNullable: false, isUnique: true, isIndexed: true },
        { id: 'p_title', name: 'title', type: 'VARCHAR', lengthOrPrecision: '255', isPk: false, isFk: false, isNullable: false, isUnique: false },
        { id: 'p_price', name: 'price', type: 'DECIMAL', lengthOrPrecision: '12,2', isPk: false, isFk: false, isNullable: false, isUnique: false },
        { id: 'p_stock_qty', name: 'stock_quantity', type: 'INT', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: '0' },
        { id: 'p_specs', name: 'attributes', type: 'JSONB', isPk: false, isFk: false, isNullable: true, isUnique: false },
        { id: 'p_created_at', name: 'created_at', type: 'TIMESTAMPTZ', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: 'NOW()' }
      ]
    },
    {
      id: 'tbl_orders',
      name: 'orders',
      comment: 'Заказы пользователей и финансовый статус',
      x: 440,
      y: 100,
      color: '#8b5cf6', // purple
      columns: [
        { id: 'o_id', name: 'id', type: 'BIGSERIAL', isPk: true, isFk: false, isNullable: false, isUnique: true },
        { id: 'o_user_id', name: 'user_id', type: 'BIGINT', isPk: false, isFk: true, isNullable: false, isUnique: false, isIndexed: true },
        { id: 'o_order_number', name: 'order_number', type: 'VARCHAR', lengthOrPrecision: '50', isPk: false, isFk: false, isNullable: false, isUnique: true },
        { id: 'o_status', name: 'status', type: 'ENUM', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: "'NEW'" },
        { id: 'o_total', name: 'total_amount', type: 'DECIMAL', lengthOrPrecision: '12,2', isPk: false, isFk: false, isNullable: false, isUnique: false },
        { id: 'o_shipping_addr', name: 'shipping_address', type: 'TEXT', isPk: false, isFk: false, isNullable: false, isUnique: false },
        { id: 'o_created_at', name: 'created_at', type: 'TIMESTAMPTZ', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: 'NOW()', isIndexed: true }
      ]
    },
    {
      id: 'tbl_order_items',
      name: 'order_items',
      comment: 'Позиции в заказе (связующая таблица)',
      x: 440,
      y: 440,
      color: '#ec4899', // pink
      columns: [
        { id: 'oi_id', name: 'id', type: 'BIGSERIAL', isPk: true, isFk: false, isNullable: false, isUnique: true },
        { id: 'oi_order_id', name: 'order_id', type: 'BIGINT', isPk: false, isFk: true, isNullable: false, isUnique: false },
        { id: 'oi_product_id', name: 'product_id', type: 'BIGINT', isPk: false, isFk: true, isNullable: false, isUnique: false },
        { id: 'oi_quantity', name: 'quantity', type: 'INT', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: '1' },
        { id: 'oi_unit_price', name: 'unit_price', type: 'DECIMAL', lengthOrPrecision: '12,2', isPk: false, isFk: false, isNullable: false, isUnique: false }
      ]
    },
    {
      id: 'tbl_payments',
      name: 'payments',
      comment: 'Транзакции шлюзов оплаты (Stripe / Банк)',
      x: 60,
      y: 450,
      color: '#f59e0b', // amber
      columns: [
        { id: 'pay_id', name: 'id', type: 'UUID', isPk: true, isFk: false, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' },
        { id: 'pay_order_id', name: 'order_id', type: 'BIGINT', isPk: false, isFk: true, isNullable: false, isUnique: false, isIndexed: true },
        { id: 'pay_provider', name: 'payment_method', type: 'VARCHAR', lengthOrPrecision: '50', isPk: false, isFk: false, isNullable: false, isUnique: false },
        { id: 'pay_amount', name: 'amount', type: 'DECIMAL', lengthOrPrecision: '12,2', isPk: false, isFk: false, isNullable: false, isUnique: false },
        { id: 'pay_status', name: 'status', type: 'VARCHAR', lengthOrPrecision: '30', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: "'PENDING'" },
        { id: 'pay_txn_id', name: 'transaction_ref', type: 'VARCHAR', lengthOrPrecision: '128', isPk: false, isFk: false, isNullable: true, isUnique: true },
        { id: 'pay_paid_at', name: 'paid_at', type: 'TIMESTAMPTZ', isPk: false, isFk: false, isNullable: true, isUnique: false }
      ]
    }
  ],
  relationships: [
    {
      id: 'rel_orders_users',
      sourceTableId: 'tbl_orders',
      sourceColumnId: 'o_user_id',
      targetTableId: 'tbl_users',
      targetColumnId: 'u_id',
      type: '1:N',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      name: 'fk_orders_user_id'
    },
    {
      id: 'rel_products_categories',
      sourceTableId: 'tbl_products',
      sourceColumnId: 'p_category_id',
      targetTableId: 'tbl_categories',
      targetColumnId: 'cat_id',
      type: '1:N',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      name: 'fk_products_category_id'
    },
    {
      id: 'rel_order_items_orders',
      sourceTableId: 'tbl_order_items',
      sourceColumnId: 'oi_order_id',
      targetTableId: 'tbl_orders',
      targetColumnId: 'o_id',
      type: '1:N',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      name: 'fk_order_items_order_id'
    },
    {
      id: 'rel_order_items_products',
      sourceTableId: 'tbl_order_items',
      sourceColumnId: 'oi_product_id',
      targetTableId: 'tbl_products',
      targetColumnId: 'p_id',
      type: '1:N',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      name: 'fk_order_items_product_id'
    },
    {
      id: 'rel_payments_orders',
      sourceTableId: 'tbl_payments',
      sourceColumnId: 'pay_order_id',
      targetTableId: 'tbl_orders',
      targetColumnId: 'o_id',
      type: '1:1',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      name: 'fk_payments_order_id'
    }
  ],
  shapes: [
    {
      id: 'shape_note_architecture',
      type: 'sticky_note',
      label: '📌 Архитектурный регламент:\n• Все внешние ключи каскадируются\n• Цены хранятся в DECIMAL(12,2)\n• Партиционирование заказов по дате',
      x: 60,
      y: 430,
      width: 230,
      height: 120,
      fillColor: '#fef08a',
      strokeColor: '#ca8a04',
      strokeWidth: 1.5,
      strokeStyle: 'solid',
      textColor: '#78350f',
      fontSize: 11,
      hasShadow: true,
    },
    {
      id: 'shape_cloud_api',
      type: 'cloud',
      label: 'Payment Gateway API',
      x: 440,
      y: 480,
      width: 170,
      height: 80,
      fillColor: '#dbeafe',
      strokeColor: '#2563eb',
      strokeWidth: 1.5,
      strokeStyle: 'dashed',
      textColor: '#1e3a8a',
      fontSize: 12,
      hasShadow: true,
    }
  ]
};

export const schemaTemplates: { id: string; name: string; description: string; schema: Schema }[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Интернет-магазин с пользователями, каталогом, заказами и платежами',
    schema: initialSchema
  },
  {
    id: 'saas',
    name: 'SaaS Multi-tenant & Billing',
    description: 'Мультитенантная платформа с организациями, подписками, проектами и ролями',
    schema: {
      id: 'schema_saas',
      name: 'SaaS_Platform_DB',
      dialect: 'PostgreSQL',
      version: 1,
      tables: [
        {
          id: 'tbl_tenants',
          name: 'organizations',
          comment: 'Компании и рабочие пространства клиентов',
          x: 60,
          y: 100,
          color: '#3b82f6',
          columns: [
            { id: 'ten_id', name: 'id', type: 'UUID', isPk: true, isFk: false, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' },
            { id: 'ten_name', name: 'name', type: 'VARCHAR', lengthOrPrecision: '100', isPk: false, isFk: false, isNullable: false, isUnique: false },
            { id: 'ten_slug', name: 'slug', type: 'VARCHAR', lengthOrPrecision: '64', isPk: false, isFk: false, isNullable: false, isUnique: true },
            { id: 'ten_plan', name: 'subscription_plan', type: 'VARCHAR', lengthOrPrecision: '32', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: "'starter'" },
            { id: 'ten_created_at', name: 'created_at', type: 'TIMESTAMPTZ', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: 'NOW()' }
          ]
        },
        {
          id: 'tbl_org_users',
          name: 'memberships',
          comment: 'Связь пользователей с организациями и роли в них',
          x: 450,
          y: 100,
          color: '#8b5cf6',
          columns: [
            { id: 'mem_id', name: 'id', type: 'BIGSERIAL', isPk: true, isFk: false, isNullable: false, isUnique: true },
            { id: 'mem_org_id', name: 'org_id', type: 'UUID', isPk: false, isFk: true, isNullable: false, isUnique: false },
            { id: 'mem_user_id', name: 'user_id', type: 'UUID', isPk: false, isFk: false, isNullable: false, isUnique: false },
            { id: 'mem_role', name: 'role', type: 'VARCHAR', lengthOrPrecision: '32', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: "'member'" }
          ]
        },
        {
          id: 'tbl_projects',
          name: 'projects',
          comment: 'Проекты внутри организации',
          x: 450,
          y: 350,
          color: '#10b981',
          columns: [
            { id: 'prj_id', name: 'id', type: 'UUID', isPk: true, isFk: false, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' },
            { id: 'prj_org_id', name: 'org_id', type: 'UUID', isPk: false, isFk: true, isNullable: false, isUnique: false },
            { id: 'prj_name', name: 'name', type: 'VARCHAR', lengthOrPrecision: '100', isPk: false, isFk: false, isNullable: false, isUnique: false },
            { id: 'prj_status', name: 'status', type: 'VARCHAR', lengthOrPrecision: '32', isPk: false, isFk: false, isNullable: false, isUnique: false, defaultValue: "'active'" }
          ]
        }
      ],
      relationships: [
        {
          id: 'rel_mem_org',
          sourceTableId: 'tbl_org_users',
          sourceColumnId: 'mem_org_id',
          targetTableId: 'tbl_tenants',
          targetColumnId: 'ten_id',
          type: '1:N',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        {
          id: 'rel_prj_org',
          sourceTableId: 'tbl_projects',
          sourceColumnId: 'prj_org_id',
          targetTableId: 'tbl_tenants',
          targetColumnId: 'ten_id',
          type: '1:N',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        }
      ]
    }
  }
];

export const SCHEMA_TEMPLATES = schemaTemplates;

export const initialUsers = [
  {
    id: 'u-1',
    name: 'Бекжан Кенесбек',
    email: 'kenesbekbekzhan93@gmail.com',
    role: 'Super Admin' as const,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    status: 'active' as const,
    permissions: {
      canEditSchema: true,
      canDropTables: true,
      canExecuteQueries: true,
      canExportSql: true,
      canCommitGit: true,
      canManageAccess: true,
      canViewAudit: true,
    },
    lastActive: 'Сейчас в сети'
  },
  {
    id: 'u-2',
    name: 'Александр Архитектор',
    email: 'alex.db@enterprise.io',
    role: 'Database Architect' as const,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    status: 'active' as const,
    permissions: {
      canEditSchema: true,
      canDropTables: false,
      canExecuteQueries: true,
      canExportSql: true,
      canCommitGit: true,
      canManageAccess: false,
      canViewAudit: true,
    },
    lastActive: '12 минут назад'
  },
  {
    id: 'u-3',
    name: 'Елена Смирнова',
    email: 'elena.dev@enterprise.io',
    role: 'Schema Editor' as const,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    status: 'active' as const,
    permissions: {
      canEditSchema: true,
      canDropTables: false,
      canExecuteQueries: true,
      canExportSql: true,
      canCommitGit: false,
      canManageAccess: false,
      canViewAudit: false,
    },
    lastActive: '2 часа назад'
  },
  {
    id: 'u-4',
    name: 'Максим Аналитик',
    email: 'maxim.data@enterprise.io',
    role: 'Read-Only Analyst' as const,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    status: 'active' as const,
    permissions: {
      canEditSchema: false,
      canDropTables: false,
      canExecuteQueries: true,
      canExportSql: true,
      canCommitGit: false,
      canManageAccess: false,
      canViewAudit: false,
    },
    lastActive: 'Вчера, 18:40'
  }
];
