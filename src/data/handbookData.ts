export interface HandbookArticle {
  id: string;
  category: 'normalization' | 'indexing' | 'transactions' | 'scaling' | 'architecture';
  title: string;
  summary: string;
  badge: string;
  readTime: string;
  content: string;
  sqlExamples: string[];
  bestPractices: string[];
  pitfalls: string[];
}

export interface SystemCrashSolution {
  id: string;
  code: string;
  title: string;
  category: 'locks' | 'memory' | 'storage' | 'network' | 'integrity';
  severity: 'Critical' | 'High' | 'Medium';
  symptom: string;
  rootCause: string;
  immediateCommands: string[];
  permanentFix: string;
  preventionTip: string;
}

export const handbookArticles: HandbookArticle[] = [
  {
    id: 'normalization-1nf-3nf-bcnf',
    category: 'normalization',
    title: 'Нормализация реляционных баз данных: от 1NF до BCNF и денормализация',
    summary: 'Как проектировать чистую схему без аномалий вставки, обновления и удаления, и в каких случаях оправдана денормализация.',
    badge: 'Архитектура данных',
    readTime: '8 мин',
    content: `Нормализация — это процесс организации полей и таблиц реляционной базы данных для минимизации избыточности и устранения аномалий модификации данных.

### 1-я Нормальная Форма (1NF)
• Каждая таблица должна иметь первичный ключ (Primary Key).
• Значения в каждой ячейке должны быть атомарными (нельзя хранить список телефонов через запятую или массивы в скалярных полях без необходимости).
• Отсутствуют повторяющиеся группы колонок (phone1, phone2, phone3).

### 2-я Нормальная Форма (2NF)
• Соответствует 1NF.
• Каждый неключевой столбец должен полностью функционально зависеть от всего первичного ключа, а не от его части (актуально при составных PK).

### 3-я Нормальная Форма (3NF)
• Соответствует 2NF.
• Отсутствуют транзитивные зависимости: неключевые столбцы зависят ТОЛЬКО от первичного ключа (например, если есть customer_id и customer_city, то город должен быть в таблице клиентов, а не дублироваться в заказах).

### Нормальная форма Бойса-Кодда (BCNF)
• Усиленная версия 3NF, где любой детерминант является потенциальным суперключом.

### Когда нужна осознанная денормализация?
1. Высоконагруженная OLAP-аналитика и отчетность (DWH, витрины данных).
2. Вычисление предрассчитанных агрегатов (например, \`total_orders_count\` или \`cached_balance\` с обновлением по триггеру или событию).
3. Избежание чрезмерного количества JOIN (> 6-8 таблиц) при жестких SLA на миллисекундный ответ API.`,
    sqlExamples: [
      `-- Нарушение 1NF (неатомарные значения):
-- CREATE TABLE orders (id INT, item_ids VARCHAR(255)); 

-- Правильное проектирование (1NF + 3NF):
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL
);`
    ],
    bestPractices: [
      'Всегда начинайте проектирование со строгой 3NF',
      'Денормализуйте данные только на основе реальных замеров производительности (EXPLAIN ANALYZE)',
      'Используйте внешние ключи с явным указанием ON DELETE CASCADE / RESTRICT для гарантии целостности'
    ],
    pitfalls: [
      'Хранение массивов ID в текстовых полях вместо таблицы связей M:N',
      'Отсутствие уникальных ограничений (UNIQUE) на бизнес-ключи (например, email, sku, slug)'
    ]
  },
  {
    id: 'indexing-deep-dive',
    category: 'indexing',
    title: 'Стратегии индексирования: B-Tree, Hash, GIN, составные и покрывающие индексы',
    summary: 'Как работают индексы на диске, почему планировщик игнорирует индекс, и как строить композитные индексы по правилу левого префикса.',
    badge: 'Оптимизация производительности',
    readTime: '10 мин',
    content: `Индекс — это специализированная вспомогательная структура данных (чаще всего сбалансированное дерево B-Tree), которая позволяет находить строки со сложностью O(log N) вместо полного последовательного сканирования таблицы O(N).

### Типы индексов в современных СУБД:
1. **B-Tree (по умолчанию)**: Подходит для операторов \`=\`, \`<\`, \`<=\`, \`>\`, \`>=\`, \`BETWEEN\`, \`IN\`, а также \`LIKE 'abc%'\` (с фиксацией префикса).
2. **GIN (Generalized Inverted Index)**: Идеален для полнотекстового поиска, массивов и JSONB документов (операторы \`@>\`, \`?||\`).
3. **GiST / SP-GiST**: Для геопространственных данных (PostGIS), полигонов и диапазонов (например, \`tsrange\`).
4. **BRIN (Block Range Index)**: Колоссально экономит память на гигантских временных рядах (Time-series / Logs), физически упорядоченных по \`created_at\`.

### Правило левого префикса для составных (Composite) индексов:
Если создан индекс \`CREATE INDEX idx_orders ON orders (tenant_id, status, created_at DESC)\`:
• Запрос с \`WHERE tenant_id = 5 AND status = 'PAID'\` — ИСПОЛЬЗУЕТ индекс.
• Запрос с \`WHERE tenant_id = 5\` — ИСПОЛЬЗУЕТ индекс.
• Запрос с \`WHERE status = 'PAID'\` — НЕ ИСПОЛЬЗУЕТ индекс (пропуск левого префикса).

### Покрывающие индексы (Covering Index / INCLUDE):
Индекс может содержать дополнительные полезные поля в секции \`INCLUDE\`. Это позволяет СУБД выполнять **Index-Only Scan**, вообще не обращаясь к Heap-страницам таблицы!`,
    sqlExamples: [
      `-- Составной индекс с учетом сортировки:
CREATE INDEX idx_orders_user_created 
ON orders (user_id, created_at DESC);

-- Покрывающий индекс (Index-Only Scan):
CREATE INDEX idx_users_active_lookup 
ON users (email) 
INCLUDE (id, full_name, role);

-- GIN индекс для быстрого поиска по JSONB свойствам:
CREATE INDEX idx_products_attributes_gin 
ON products USING GIN (attributes);

-- Частичный (Partial) индекс: индексирует только активные заказы
CREATE INDEX idx_active_orders 
ON orders (user_id) 
WHERE status IN ('NEW', 'PROCESSING');`
    ],
    bestPractices: [
      'Всегда индексируйте внешние ключи (Foreign Keys) — СУБД не делает это автоматически во многих движках!',
      'Используйте частичные индексы (Partial Indexes) для фильтрации редких или активных статусов',
      'Регулярно анализируйте неиспользуемые индексы через pg_stat_user_indexes (каждый лишний индекс замедляет INSERT/UPDATE/DELETE)'
    ],
    pitfalls: [
      'Применение функций к индексированной колонке в WHERE ломает индекс. Используйте диапазоны вместо функций.',
      'Несоответствие типов данных (Type Mismatch): поиск строки по числовому полю вызывает неявный CAST и игнорирование индекса'
    ]
  },
  {
    id: 'acid-transactions-and-isolation',
    category: 'transactions',
    title: 'ACID, уровни изоляции транзакций и предотвращение Deadlock',
    summary: 'Разница между Read Committed, Repeatable Read и Serializable. Что такое грязное чтение, фантомы и как безопасно блокировать строки.',
    badge: 'Надежность & Concurrency',
    readTime: '9 мин',
    content: `Транзакция — это неделимая единица работы с базой данных, гарантирующая соблюдение свойств ACID (Atomicity, Consistency, Isolation, Durability).

### Аномалии параллельного доступа:
1. **Dirty Read (Грязное чтение)**: Чтение незафиксированных изменений другой транзакции (которая затем может откатиться).
2. **Non-Repeatable Read (Неповторяющееся чтение)**: Повторное чтение той же строки возвращает другие данные, потому что параллельная транзакция зафиксировала UPDATE.
3. **Phantom Read (Фантомное чтение)**: Повторный запрос диапазона строк возвращает больше строк, так как другая транзакция зафиксировала INSERT.
4. **Serialization Anomaly**: Результат параллельного выполнения отличается от любого возможного строго последовательного выполнения.

### Уровни изоляции транзакций (SQL Standard):
• **Read Uncommitted**: Разрешены грязные чтения (не поддерживается в PostgreSQL, приравнивается к Read Committed).
• **Read Committed**: Стандарт по умолчанию в большинстве СУБД. Видны только зафиксированные снимки.
• **Repeatable Read**: Снимок данных (Snapshot) фиксируется на момент начала первой команды транзакции. Идеально для длинных отчетов.
• **Serializable**: Максимальная строгость. При обнаружении конфликтов параллелизма СУБД выбрасывает ошибку 40001 (Serialization Failure) и требует повтора транзакции (Retry).

### Как избежать взаимных блокировок (Deadlocks):
• Всегда блокируйте ресурсы и обновляйте строки в **СТРОГО ОДИНАКОВОМ ПОРЯДКЕ** во всех частях кода (например, сортируя ID: \`ORDER BY id\`).
• Держите транзакции как можно короче: никогда не вызывайте сторонние HTTP API или медленные микросервисы внутри открытой SQL-транзакции!
• Используйте \`SELECT ... FOR UPDATE SKIP LOCKED\` для очередей задач (Job Queues), чтобы воркеры не дрались за одни и те же строки.`,
    sqlExamples: [
      `-- Безопасная выборка для обновления баланса:
BEGIN;
SELECT id, balance 
FROM accounts 
WHERE id = 105 
FOR UPDATE;

UPDATE accounts 
SET balance = balance - 100.00 
WHERE id = 105;

COMMIT;

-- Высокопроизводительная очередь задач без взаимных блокировок:
SELECT id, task_payload 
FROM job_queue 
WHERE status = 'PENDING' 
ORDER BY id ASC 
LIMIT 1 
FOR UPDATE SKIP LOCKED;`
    ],
    bestPractices: [
      'Сортируйте batch-обновления по первичному ключу перед отправкой в СУБД',
      'Устанавливайте строгие lock_timeout и statement_timeout, чтобы зависший запрос не парализовал всю базу',
      'Реализуйте экспоненциальный retry на уровне приложения для транзакций со статусом Serialization Failure'
    ],
    pitfalls: [
      'Длительные транзакции с ожиданием ответа внешних платежных шлюзов или email-сервисов',
      'Блокировка всей таблицы (LOCK TABLE) вместо точечных блокировок строк'
    ]
  },
  {
    id: 'scaling-and-connection-pooling',
    category: 'scaling',
    title: 'Масштабирование, PgBouncer, Read Replicas и борьба со спуллингом соединений',
    summary: 'Почему прямое подключение 1000 клиентов убьет процессор СУБД, как устроен PgBouncer и как настроить репликацию для масштабирования чтения.',
    badge: 'HighLoad & Инфраструктура',
    readTime: '7 мин',
    content: `В классических СУБД (например, PostgreSQL) каждое соединение — это отдельный процесс операционной системы, требующий выделенной памяти (от 5 до 20 МБ RAM) и переключения контекста ядра ОС.

Если 500 микросервисов откроют по 20 прямых соединений, база рухнет под весом 10 000 процессов. Решение — архитектурный пулинг соединений (Connection Pooling).

### Режимы пулинга (на примере PgBouncer):
1. **Session Pooling**: Соединение закрепляется за клиентом на все время сессии. Безопасно, но масштабируется хуже.
2. **Transaction Pooling (Рекомендуется для 95% приложений)**: Соединение выдается из пула только на время выполнения \`BEGIN ... COMMIT\`. Один серверный процесс может обслужить десятки тысяч клиентов!
3. **Statement Pooling**: Соединение выдается на один отдельный SQL-запрос (не поддерживает многошаговые транзакции).

### Чтение с реплик (Read-Only Replicas):
• Все модификации (INSERT, UPDATE, DELETE) направляются на Primary (Leader).
• Тяжелые аналитические запросы и витрины направляются на Read Replicas через потоковую репликацию (Streaming Replication).
• **Внимание:** учитывайте задержку репликации (Replication Lag): если пользователь сохранил профиль и моментально обновил страницу, чтение с отстающей реплики может показать старые данные (Read-Your-Own-Writes проблема).`,
    sqlExamples: [
      `-- Мониторинг активных соединений и состояний в PostgreSQL:
SELECT count(*), state 
FROM pg_stat_activity 
GROUP BY state;

-- Замер задержки потоковой репликации на Leader узле:
SELECT client_addr, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn) AS write_lag_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;`
    ],
    bestPractices: [
      'Всегда используйте PgBouncer или встроенный пул фреймворка (HikariCP, Poolboy)',
      'Ограничивайте максимальный пул до формулы: max_connections ≈ (CPU cores * 2) + disk_spindles',
      'Для критичных сценариев "прочитай сразу после записи" направляйте повторный SELECT на Primary ноду'
    ],
    pitfalls: [
      'Увеличение max_connections в postgresql.conf до 5000 вместо установки PgBouncer приводит к деградации CPU Cache'
    ]
  }
];

export const systemCrashCatalog: SystemCrashSolution[] = [
  {
    id: 'crash-deadlock',
    code: '40P01',
    title: 'Deadlock Detected (Взаимная блокировка процессов)',
    category: 'locks',
    severity: 'High',
    symptom: 'Ошибки приложения: "ERROR: deadlock detected: Process X waits for ShareLock on transaction Y". Транзакция аварийно прервана.',
    rootCause: 'Два или более параллельных процесса захватили блокировки на разные строки в противоположном порядке и ждут освобождения друг друга.',
    immediateCommands: [
      `-- Найти транзакции, удерживающие блокировки прямо сейчас:
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM  pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;`,
      `-- Экстренно завершить зависший блокирующий процесс:
SELECT pg_terminate_backend(blocking_pid);`
    ],
    permanentFix: 'Унифицируйте порядок обновления строк в транзакциях (всегда сортируйте ID перед UPDATE). Добавьте lock_timeout = 3000ms и retry-логику в клиентском коде.',
    preventionTip: 'Никогда не выполняйте долгие расчеты или сетевые запросы внутри транзакций с активными блокировками.'
  },
  {
    id: 'crash-conn-exhaustion',
    code: '53300',
    title: 'Too Many Connections / Connection Pool Exhaustion',
    category: 'network',
    severity: 'Critical',
    symptom: 'База данных перестает принимать новые запросы: "FATAL: remaining connection slots are reserved for non-replicated superuser connections".',
    rootCause: 'Микросервисы или воркеры открыли слишком много не закрытых или зависших соединений, превысив лимит max_connections.',
    immediateCommands: [
      `-- Проверить количество подключений по базам и состояниям:
SELECT datname, count(*), state 
FROM pg_stat_activity 
GROUP BY datname, state;`,
      `-- Экстренно завершить все соединения в статусе "idle in transaction" старше 5 минут:
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction' 
  AND state_change < current_timestamp - INTERVAL '5 minutes';`
    ],
    permanentFix: 'Внедрите PgBouncer в режиме transaction pooling. Установите idle_in_transaction_session_timeout = 30000ms в postgresql.conf.',
    preventionTip: 'Клиентские пулы (HikariCP, TypeORM, SQLAlchemy) должны иметь строгий connectionTimeout и maxPoolSize.'
  },
  {
    id: 'crash-oom-killer',
    code: '53200',
    title: 'Out of Memory / Linux OOM Killer',
    category: 'memory',
    severity: 'Critical',
    symptom: 'База данных внезапно падает и перезапускается в режиме восстановления: "PANIC: could not write to file ... Out of memory" или dmesg показывает "Killed process postgres".',
    rootCause: 'Суммарный объем shared_buffers + (work_mem * max_connections) превысил доступную физическую оперативную память сервера.',
    immediateCommands: [
      `-- Проверить текущие лимиты памяти в СУБД:
SHOW shared_buffers;
SHOW work_mem;
SHOW maintenance_work_mem;`,
      `-- Найти запросы, потребляющие много временного дискового пространства и памяти:
SELECT query, calls, total_exec_time, temp_blks_written 
FROM pg_stat_statements 
ORDER BY temp_blks_written DESC 
LIMIT 10;`
    ],
    permanentFix: 'Скорректируйте параметры: shared_buffers не более 25% от RAM, work_mem рассчитывать как (RAM - shared_buffers) / (max_connections * 2). Запретите чрезмерный overcommit в Linux: vm.overcommit_memory = 2.',
    preventionTip: 'Следите за тяжелыми хеш-джойнами (Hash Join) и сортировками больших таблиц без индекса.'
  },
  {
    id: 'crash-fk-violation',
    code: '23503',
    title: 'Foreign Key Constraint Violation',
    category: 'integrity',
    severity: 'Medium',
    symptom: 'ERROR: insert or update on table "orders" violates foreign key constraint "fk_orders_user_id". Key (user_id)=(999) is not present in table "users".',
    rootCause: 'Попытка вставки дочерней записи, ссылающейся на несуществующего родителя, либо удаление родительской записи при наличии дочерних с правилом ON DELETE RESTRICT.',
    immediateCommands: [
      `-- Найти осиротевшие записи перед созданием внешнего ключа:
SELECT o.id, o.user_id 
FROM orders o 
LEFT JOIN users u ON o.user_id = u.id 
WHERE u.id IS NULL;`
    ],
    permanentFix: 'Настройте каскадное поведение (ON DELETE CASCADE или ON DELETE SET NULL) либо используйте отложенные внешние ключи (DEFERRABLE INITIALLY DEFERRED) в сложных составных транзакциях.',
    preventionTip: 'Убедитесь, что миграции данных создают родительские записи до дочерних.'
  },
  {
    id: 'crash-wal-disk-full',
    code: '53100',
    title: 'Disk Full / WAL Archive Stall',
    category: 'storage',
    severity: 'Critical',
    symptom: 'ERROR: could not write to file "base/...": No space left on device. База данных переходит в аварийный режим Read-Only.',
    rootCause: 'Переполнение диска журналами предзаписи (WAL) из-за зависшего слота репликации (replication slot), неудачного бэкапа или разрастания логов.',
    immediateCommands: [
      `-- Проверить неактивные слоты репликации, удерживающие WAL:
SELECT slot_name, plugin, active, wal_status 
FROM pg_replication_slots;`,
      `-- Удалить брошенный слот репликации, освобождая гигабайты WAL:
SELECT pg_drop_replication_slot('abandoned_slot_name');`
    ],
    permanentFix: 'Установите max_slot_wal_keep_size (например, 20GB), чтобы слоты не могли занять весь диск. Настройте мониторинг свободного места с алертом на 80%.',
    preventionTip: 'Храните pg_wal на отдельном быстром NVMe диске отдельно от каталога данных.'
  }
];
