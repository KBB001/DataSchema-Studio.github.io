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
  Minimize2,
  Play,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Search,
  FileText,
  Sliders,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  BookmarkPlus,
  GitCompare,
} from 'lucide-react';
import { Schema, SqlDialect, Table, Relationship, Column } from '../types';
import {
  generateSql,
  generateSeedDataSql,
  generateMermaidErDiagram,
  generateDbml,
  generateMigrationScript,
  parseSqlDdl,
  stripSqlCommentsSafely,
  detectSqlDialectDetailed,
  DialectDetectionResult,
  SqlExportOptions
} from '../utils/sqlGenerator';
import {
  generatePrismaSchema,
  generateDrizzleSchema,
  generateTypeOrmSchema,
  generateDataDictionaryMarkdown,
  calculateSchemaDiff,
  SchemaDiffResult
} from '../utils/ormGenerators';
import { generateSchemaFromSql } from '../utils/sqlQueryParser';

export const DEFAULT_CAR_RENTAL_SQL = `-- 1. ДЕРЕКТЕР ҚОРЫН ҚҰРУ
CREATE DATABASE IF NOT EXISTS car_rental_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE car_rental_db;

-- 2. КЕСТЕЛЕРДІ ҚҰРУ (DDL)

-- Көліктер кестесі
CREATE TABLE Cars (
    car_id INT AUTO_INCREMENT PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    daily_rate DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);

-- Клиенттер кестесі
CREATE TABLE Clients (
    client_id INT AUTO_INCREMENT PRIMARY KEY,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    driver_license VARCHAR(20) NOT NULL UNIQUE,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    is_vip BOOLEAN DEFAULT FALSE
);

-- Жалға алу кестесі
CREATE TABLE Rentals (
    rental_id INT AUTO_INCREMENT PRIMARY KEY,
    car_id INT NOT NULL,
    client_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    discount_applied DECIMAL(5, 2) DEFAULT 0.00,
    CONSTRAINT fk_rentals_car FOREIGN KEY (car_id) REFERENCES Cars(car_id) ON DELETE CASCADE,
    CONSTRAINT fk_rentals_client FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE CASCADE
);

-- 3. ТРИГГЕРЛЕР

DELIMITER //

-- Триггер 1: Көлік жалдауға берілгенде оның мәртебесін "Бос емес" (is_available = FALSE) етіп өзгерту
CREATE TRIGGER update_car_status_after_rent
AFTER INSERT ON Rentals
FOR EACH ROW
BEGIN
    UPDATE Cars
    SET is_available = FALSE
    WHERE car_id = NEW.car_id;
END//

-- Триггер 2: Жалпы жұмсаған сомасы 50 000 ₸-дан асса, клиентке автоматты түрде VIP мәртебесін беру
CREATE TRIGGER check_vip_client
AFTER INSERT ON Rentals
FOR EACH ROW
BEGIN
    DECLARE v_total_spent DECIMAL(10, 2);
    
    SELECT SUM(total_cost) INTO v_total_spent 
    FROM Rentals 
    WHERE client_id = NEW.client_id;

    IF v_total_spent >= 50000.00 THEN
        UPDATE Clients 
        SET is_vip = TRUE 
        WHERE client_id = NEW.client_id;
    END IF;
END//

DELIMITER ;

-- 4. САҚТАЛАТЫН ПРОЦЕДУРА (STORED PROCEDURE)
DELIMITER //

CREATE PROCEDURE CreateRental(
    IN p_car_id INT,
    IN p_client_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE v_daily_rate DECIMAL(10, 2);
    DECLARE v_is_available BOOLEAN;
    DECLARE v_is_vip BOOLEAN;
    DECLARE v_days INT;
    DECLARE v_discount DECIMAL(5, 2) DEFAULT 0.00;
    DECLARE v_subtotal DECIMAL(10, 2);
    DECLARE v_total_cost DECIMAL(10, 2);

    -- 1. Көліктің бос-бос еместігін және тәуліктік бағасын алу
    SELECT daily_rate, is_available INTO v_daily_rate, v_is_available 
    FROM Cars WHERE car_id = p_car_id;

    -- 2. Клиенттің VIP мәртебесін тексеру
    SELECT is_vip INTO v_is_vip 
    FROM Clients WHERE client_id = p_client_id;

    -- 3. Жалдау күндерін есептеу
    SET v_days = DATEDIFF(p_end_date, p_start_date);

    IF v_days <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Қате: Аяқталу күні басталу күнінен кейін болуы керек!';
    ELSEIF v_is_available = FALSE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Қате: Бұл көлік қазір бос емес!';
    ELSE
        -- VIP клиент болса 10% жеңілдік беру
        IF v_is_vip = TRUE THEN
            SET v_discount = 10.00;
        END IF;

        SET v_subtotal = v_daily_rate * v_days;
        SET v_total_cost = v_subtotal - (v_subtotal * (v_discount / 100));

        -- Жалға алу жазбасын енгізу
        INSERT INTO Rentals (car_id, client_id, start_date, end_date, total_days, total_cost, discount_applied)
        VALUES (p_car_id, p_client_id, p_start_date, p_end_date, v_days, v_total_cost, v_discount);
    END IF;
END//

DELIMITER ;

-- 5. ТЕСТТІК МӘЛІМЕТТЕР ЕНГІЗУ
INSERT INTO Cars (brand, model, license_plate, daily_rate) VALUES
('Toyota', 'Camry 70', '001AAA02', 20000.00),
('Hyundai', 'Elantra', '002BBB02', 15000.00),
('Mercedes-Benz', 'E-Class', '003CCC02', 35000.00);

INSERT INTO Clients (last_name, first_name, driver_license, phone, email) VALUES
('Аскаров', 'Айдос', 'DL123456', '87071112233', 'aidos@example.com'),
('Серікова', 'Мадина', 'DL654321', '87074445566', 'madina@example.com');

-- 6. ТЕСТТІК СЦЕНАРИЙДІ ОРЫНДАУ
CALL CreateRental(1, 1, '2026-10-01', '2026-10-04');

-- 7. АНАЛИТИКАЛЫҚ СҰРАНЫСТАР (QUERIES)
SELECT 
    car_id,
    CONCAT(brand, ' ', model) AS Көлік,
    license_plate AS Мем_номер,
    daily_rate AS Тәуліктік_баға,
    IF(is_available, 'Бос', 'Жалға берілген') AS Мәртебесі
FROM Cars;

SELECT 
    r.rental_id,
    CONCAT(c.last_name, ' ', c.first_name) AS Клиент,
    CONCAT(car.brand, ' ', car.model) AS Көлік,
    r.start_date AS Басталды,
    r.end_date AS Аяқталды,
    r.total_days AS Күн_саны,
    CONCAT(r.discount_applied, '%') AS Жеңілдік,
    r.total_cost AS Жалпы_сома
FROM Rentals r
JOIN Clients c ON r.client_id = c.client_id
JOIN Cars car ON r.car_id = car.car_id;

SELECT 
    client_id,
    CONCAT(last_name, ' ', first_name) AS Клиент,
    IF(is_vip, 'Иә (VIP 10%)', 'Жоқ') AS VIP_Мәртебе
FROM Clients;`;

export const DEFAULT_ECOMMERCE_SQL = `-- 1. ДЕРЕКТЕР ҚОРЫ ЖӘНЕ КОДИРОВКА
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS \`ECommerceDB\`;
CREATE DATABASE \`ECommerceDB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`ECommerceDB\`;

SET FOREIGN_KEY_CHECKS = 1;

-- 2. КЕСТЕЛЕРДІ ҚҰРУ (DDL)

-- 1. Тұтынушылар кестесі (Customers)
CREATE TABLE \`Покупатели\` (
    \`ID_Покупателя\` INT PRIMARY KEY AUTO_INCREMENT,
    \`Фамилия\` VARCHAR(50) NOT NULL,
    \`Имя\` VARCHAR(50) NOT NULL,
    \`Отчество\` VARCHAR(50) DEFAULT NULL,
    \`Адрес\` VARCHAR(200) NOT NULL,
    \`Телефон\` VARCHAR(20) NOT NULL,
    \`Email\` VARCHAR(100) NOT NULL UNIQUE,
    \`Постоянный_клиент\` BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Тауарлар кестесі (Products)
CREATE TABLE \`Товарлар\` (
    \`ID_Товара\` INT PRIMARY KEY AUTO_INCREMENT,
    \`Наименование\` VARCHAR(100) NOT NULL,
    \`Цена\` DECIMAL(10,2) NOT NULL CHECK (\`Цена\` >= 0),
    \`Единица_измерения\` VARCHAR(20) NOT NULL,
    \`Количество_на_складе\` INT NOT NULL DEFAULT 0 CHECK (\`Количество_на_складе\` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Тапсырыс / Сатылым кестесі (Orders)
CREATE TABLE \`Продажи\` (
    \`ID_Продажи\` INT PRIMARY KEY AUTO_INCREMENT,
    \`ID_Покупателя\` INT NOT NULL,
    \`Дата_продажи\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`Дата_доставки\` DATETIME DEFAULT NULL,
    \`Общая_сумма\` DECIMAL(10,2) DEFAULT 0.00,
    \`Скидка_процент\` DECIMAL(4,2) DEFAULT 0.00 CHECK (\`Скидка_процент\` >= 0 AND \`Скидка_процент\` <= 100),
    CONSTRAINT \`fk_продажи_покупатели\` FOREIGN KEY (\`ID_Покупателя\`) REFERENCES \`Покупатели\` (\`ID_Покупателя\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Тапсырыс детальдары кестесі (Order Details)
CREATE TABLE \`Детали_продажи\` (
    \`ID_Детали\` INT PRIMARY KEY AUTO_INCREMENT,
    \`ID_Продажи\` INT NOT NULL,
    \`ID_Товара\` INT NOT NULL,
    \`Количество\` INT NOT NULL CHECK (\`Количество\` > 0),
    \`Цена_продажи\` DECIMAL(10,2) NOT NULL CHECK (\`Цена_продажи\` >= 0),
    CONSTRAINT \`fk_детали_продажи\` FOREIGN KEY (\`ID_Продажи\`) REFERENCES \`Продажи\` (\`ID_Продажи\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_детали_товары\` FOREIGN KEY (\`ID_Товара\`) REFERENCES \`Товарлар\` (\`ID_Товара\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ТРИГГЕРЛЕР

DELIMITER //

-- Сатылым жасалғаннан кейін қоймадағы тауар санын автоматты түрде азайту
CREATE TRIGGER \`trg_AfterInsertOrderDetail\`
AFTER INSERT ON \`Детали_продажи\`
FOR EACH ROW
BEGIN
    UPDATE \`Товарлар\`
    SET \`Количество_на_складе\` = \`Количество_на_складе\` - NEW.\`Количество\`
    WHERE \`ID_Товара\` = NEW.\`ID_Товара\`;
END //

-- Тұрақты тұтынушыға 2% жеңілдік беру
CREATE TRIGGER \`trg_BeforeInsertOrder\`
BEFORE INSERT ON \`Продажи\`
FOR EACH ROW
BEGIN
    DECLARE is_regular BOOLEAN DEFAULT FALSE;
    SELECT \`Постоянный_клиент\` INTO is_regular
    FROM \`Покупатели\`
    WHERE \`ID_Покупателя\` = NEW.\`ID_Покупателя\`;
    IF is_regular THEN
        SET NEW.\`Скидка_процент\` = 2.00;
    END IF;
END //

DELIMITER ;
`;

/**
 * Specialized regular expressions for robust DDL operator detection in SqlModal.tsx.
 * Designed to accurately detect DDL statements even in the presence of:
 * - Single-line comments (-- comment and MySQL # comment)
 * - Multi-line comments (/* ... * /)
 * - Custom MySQL delimiters (DELIMITER //, DELIMITER ;;, DELIMITER $$, etc.)
 * - Diverse CREATE TABLE formats (GLOBAL/LOCAL TEMPORARY, UNLOGGED, OR REPLACE, IF NOT EXISTS,
 *   schema-qualified like [dbo].[Table], "schema"."table", `db`.`table`, and unquoted/Cyrillic identifiers).
 */
export const DDL_OPERATOR_REGEXES = {
  // Matches any DELIMITER declaration: DELIMITER //, DELIMITER $$, DELIMITER ;
  delimiter: /(?:^|\n)[ \t]*DELIMITER\s+([^\s;]+)/gi,

  // Matches single-line comments (-- and #)
  singleLineComment: /(?:^|[ \t])(?:--|#)[^\n]*/g,

  // Matches multi-line comments: /* ... */
  multiLineComment: /\/\*[\s\S]*?\*\//g,

  // Universal CREATE TABLE matching across SQL dialects
  createTable:
    /CREATE\s+(?:OR\s+REPLACE\s+)?(?:(?:GLOBAL|LOCAL)\s+)?(?:TEMPORARY\s+|TEMP\s+|UNLOGGED\s+|CACHED\s+|MEMORY\s+)?TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([^\(\);]+?)(?:\s*\(|\s+AS\b|\s*$)/gi,

  // ALTER TABLE statements
  alterTable:
    /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?((?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+))*)\s+([\s\S]*?)(?:;|\/{2}|\${2}|\n\s*\n|$)/gi,

  // ALTER TABLE ... ADD FOREIGN KEY
  alterTableFk:
    /ALTER\s+TABLE\s+((?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+))*)\s+ADD\s+(?:CONSTRAINT\s+([^\s]+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+((?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+))*)\s*\(([^)]+)\)/gi,

  // ALTER TABLE ... ADD PRIMARY KEY
  alterTablePk:
    /ALTER\s+TABLE\s+((?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|[\[][^\]]+[\]]|[^\s\(\);,]+))*)\s+ADD\s+(?:CONSTRAINT\s+([^\s]+)\s+)?PRIMARY\s+KEY(?:\s+CLUSTERED)?\s*\(([^)]+)\)/gi,

  // CREATE INDEX
  createIndex:
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([^\s]+)\s+ON\s+(?:ONLY\s+)?([^\s\(]+(?:\s*\.[^\s\(]+)?)/gi,

  // CREATE TRIGGER
  createTrigger:
    /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s]+)\s+((?:BEFORE|AFTER|INSTEAD\s+OF)\s+(?:INSERT|UPDATE|DELETE)\s+ON\s+([^\s\(]+(?:\s*\.[^\s\(]+)?))/gi,

  // CREATE PROCEDURE / FUNCTION
  createRoutine:
    /CREATE\s+(?:OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION)\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s\(]+(?:\s*\.[^\s\(]+)?)\s*\(([\s\S]*?)\)/gi,

  // CREATE VIEW
  createView:
    /CREATE\s+(?:OR\s+REPLACE\s+)?(?:(?:GLOBAL|LOCAL)\s+)?(?:TEMPORARY\s+|TEMP\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s\(]+(?:\s*\.[^\s\(]+)?)\s+(?:AS\b|\()/gi,

  // DROP TABLE / VIEW / TRIGGER / PROCEDURE
  dropStatement:
    /DROP\s+(TABLE|VIEW|INDEX|TRIGGER|PROCEDURE|FUNCTION)\s+(?:IF\s+EXISTS\s+)?([^\s;]+)/gi,

  // INSERT INTO data
  insertInto:
    /INSERT\s+INTO\s+([^\s\(]+(?:\s*\.[^\s\(]+)?)\s*(?:\([^)]+\))?\s*(?:VALUES|SELECT)/gi,
};

export interface DetectedDdlItem {
  type: 'CREATE TABLE' | 'ALTER TABLE' | 'TRIGGER' | 'ROUTINE' | 'VIEW' | 'INDEX' | 'DROP' | 'DELIMITER';
  name: string;
  details?: string;
}

export interface DdlInspectionSummary {
  cleanSql: string;
  totalStatements: number;
  tableNames: string[];
  counts: {
    createTable: number;
    alterTable: number;
    triggers: number;
    routines: number;
    views: number;
    indexes: number;
    drops: number;
    inserts: number;
    delimiters: number;
    commentLines: number;
    blockComments: number;
  };
  delimitersFound: string[];
  detectedOperatorsList: DetectedDdlItem[];
}

export function inspectSqlDdlStatements(sql: string): DdlInspectionSummary {
  const normalized = sql
    .replace(/^\uFEFF/, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // 1. Detect comment counts
  let commentLinesCount = 0;
  const lineCommentMatches = normalized.match(DDL_OPERATOR_REGEXES.singleLineComment);
  if (lineCommentMatches) {
    commentLinesCount = lineCommentMatches.length;
  }

  let blockCommentsCount = 0;
  const blockCommentMatches = normalized.match(DDL_OPERATOR_REGEXES.multiLineComment);
  if (blockCommentMatches) {
    blockCommentsCount = blockCommentMatches.length;
  }

  // 2. Detect DELIMITER statements
  const delimitersFound: string[] = [];
  const detectedOperatorsList: DetectedDdlItem[] = [];

  let dMatch: RegExpExecArray | null;
  const delimRegex = new RegExp(DDL_OPERATOR_REGEXES.delimiter.source, 'gi');
  while ((dMatch = delimRegex.exec(normalized)) !== null) {
    const d = dMatch[1].trim();
    if (d && !delimitersFound.includes(d)) {
      delimitersFound.push(d);
      detectedOperatorsList.push({
        type: 'DELIMITER',
        name: d,
        details: `Пользовательский разделитель DELIMITER ${d}`,
      });
    }
  }

  // 3. Clean SQL safely for AST token and DDL parsing:
  // Strip DELIMITER statements and normalize custom terminators
  let clean = normalized.replace(/^[ \t]*DELIMITER\s+[^\n]+/gim, '');
  if (delimitersFound.length > 0) {
    for (const d of delimitersFound) {
      if (d !== ';') {
        const escapedD = d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const delimEndRegex = new RegExp(`(\\bEND|\\)|[A-Za-z0-9_\\]"\`'])\\s*${escapedD}`, 'gi');
        clean = clean.replace(delimEndRegex, '$1;');
        const delimLineRegex = new RegExp(`\\s*${escapedD}\\s*$`, 'gm');
        clean = clean.replace(delimLineRegex, ';');
      }
    }
  }
  clean = clean
    .replace(/(\bEND|\)|[A-Za-z0-9_\]"`'])\s*(\/{2}|\${2})/gi, '$1;')
    .replace(/\s*(\/{2}|\${2})\s*$/gm, ';');

  // Safely strip comments while preserving string literals and dollar quotes
  clean = stripSqlCommentsSafely(clean).trim();

  // 4. Detect CREATE TABLE operators
  const tableNames: string[] = [];
  const tableRegex = new RegExp(DDL_OPERATOR_REGEXES.createTable.source, 'gi');
  let tblMatch: RegExpExecArray | null;
  while ((tblMatch = tableRegex.exec(clean)) !== null) {
    const rawSpec = tblMatch[1].trim();
    const nameMatch = rawSpec.match(/`([^`]+)`|"([^"]+)"|\[([^\]]+)\]|([^\s\.]+)/g);
    if (nameMatch && nameMatch.length > 0) {
      const lastName = nameMatch[nameMatch.length - 1].replace(/^[`"\[\s]+|[`"\]\s]+$/g, '').trim();
      if (lastName && !tableNames.includes(lastName)) {
        tableNames.push(lastName);
        detectedOperatorsList.push({
          type: 'CREATE TABLE',
          name: lastName,
          details: rawSpec !== lastName ? `Полная спецификация: ${rawSpec}` : undefined,
        });
      }
    }
  }

  // 5. Detect ALTER TABLE operators
  const alterRegex = new RegExp(DDL_OPERATOR_REGEXES.alterTable.source, 'gi');
  let altMatch: RegExpExecArray | null;
  while ((altMatch = alterRegex.exec(clean)) !== null) {
    const rawTable = altMatch[1].trim();
    const action = altMatch[2].trim().replace(/\s+/g, ' ').substring(0, 60);
    detectedOperatorsList.push({
      type: 'ALTER TABLE',
      name: rawTable,
      details: action,
    });
  }

  // 6. Detect TRIGGERS
  const trgRegex = new RegExp(DDL_OPERATOR_REGEXES.createTrigger.source, 'gi');
  let tMatch: RegExpExecArray | null;
  while ((tMatch = trgRegex.exec(clean)) !== null) {
    const trgName = tMatch[1].trim();
    const trgEvent = tMatch[2].trim();
    detectedOperatorsList.push({
      type: 'TRIGGER',
      name: trgName,
      details: trgEvent,
    });
  }

  // 7. Detect PROCEDURES / FUNCTIONS
  const procRegex = new RegExp(DDL_OPERATOR_REGEXES.createRoutine.source, 'gi');
  let pMatch: RegExpExecArray | null;
  while ((pMatch = procRegex.exec(clean)) !== null) {
    const rType = pMatch[1].toUpperCase();
    const rName = pMatch[2].trim();
    detectedOperatorsList.push({
      type: 'ROUTINE',
      name: rName,
      details: `${rType} (${pMatch[3].trim().substring(0, 40)}...)`,
    });
  }

  // 8. Detect VIEWS
  const viewRegex = new RegExp(DDL_OPERATOR_REGEXES.createView.source, 'gi');
  let vMatch: RegExpExecArray | null;
  while ((vMatch = viewRegex.exec(clean)) !== null) {
    const vName = vMatch[1].trim();
    detectedOperatorsList.push({
      type: 'VIEW',
      name: vName,
      details: 'Представление (View)',
    });
  }

  // 9. Detect INDEXES
  const idxRegex = new RegExp(DDL_OPERATOR_REGEXES.createIndex.source, 'gi');
  let iMatch: RegExpExecArray | null;
  while ((iMatch = idxRegex.exec(clean)) !== null) {
    const idxName = iMatch[1].trim();
    const onTable = iMatch[2].trim();
    detectedOperatorsList.push({
      type: 'INDEX',
      name: idxName,
      details: `Индекс на таблице ${onTable}`,
    });
  }

  const counts = {
    createTable: tableNames.length,
    alterTable: detectedOperatorsList.filter((d) => d.type === 'ALTER TABLE').length,
    triggers: detectedOperatorsList.filter((d) => d.type === 'TRIGGER').length,
    routines: detectedOperatorsList.filter((d) => d.type === 'ROUTINE').length,
    views: detectedOperatorsList.filter((d) => d.type === 'VIEW').length,
    indexes: detectedOperatorsList.filter((d) => d.type === 'INDEX').length,
    drops: (clean.match(DDL_OPERATOR_REGEXES.dropStatement) || []).length,
    inserts: (clean.match(DDL_OPERATOR_REGEXES.insertInto) || []).length,
    delimiters: delimitersFound.length,
    commentLines: commentLinesCount,
    blockComments: blockCommentsCount,
  };

  const totalStatements =
    counts.createTable +
    counts.alterTable +
    counts.triggers +
    counts.routines +
    counts.views +
    counts.indexes;

  return {
    cleanSql: clean,
    totalStatements,
    tableNames,
    counts,
    delimitersFound,
    detectedOperatorsList,
  };
}

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
  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'export' | 'importDdl' | 'orm' | 'dictionary' | 'seed' | 'aiGen' | 'migrations' | 'formats'>('export');
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
  const [includeSeedDataInExport, setIncludeSeedDataInExport] = useState(false);
  const [includeTriggersInExport, setIncludeTriggersInExport] = useState(true);
  const [includeRoutinesInExport, setIncludeRoutinesInExport] = useState(true);
  const [roundtripResult, setRoundtripResult] = useState<{ success: boolean; message: string } | null>(null);
  const [schemaPrefix, setSchemaPrefix] = useState('');
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>('all');

  // Tab 2: Import DDL State & Intelligent Auto-Detection
  const [importDdlText, setImportDdlText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importError, setImportError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showDdlOperatorList, setShowDdlOperatorList] = useState(false);
  const [manualImportDialect, setManualImportDialect] = useState<SqlDialect | 'auto'>('auto');
  const [showAstSidebar, setShowAstSidebar] = useState(false);

  // Tab 3: ORM Generation State
  const [ormType, setOrmType] = useState<'prisma' | 'drizzle' | 'typeorm'>('prisma');
  const [ormDialect, setOrmDialect] = useState<SqlDialect>(schema.dialect || 'PostgreSQL');
  const [ormPreserveSnakeCase, setOrmPreserveSnakeCase] = useState(false);

  // Tab 4: Data Dictionary State
  const [dictionarySearch, setDictionarySearch] = useState('');
  const [dictionaryViewMode, setDictionaryViewMode] = useState<'table' | 'markdown'>('table');

  // Tab 5: Seed Data State
  const [seedDialect, setSeedDialect] = useState<SqlDialect>(schema.dialect || 'PostgreSQL');
  const [seedRowCount, setSeedRowCount] = useState<number>(5);

  // Tab 6: AI & Query to Schema State
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

  // Tab 7: Migrations & Schema Diff State
  const [migrationDialect, setMigrationDialect] = useState<SqlDialect>(schema.dialect || 'PostgreSQL');
  const [migrationTab, setMigrationTab] = useState<'diff' | 'up' | 'down'>('diff');
  const [baselineSchema, setBaselineSchema] = useState<Schema>(schema);
  const [hasCapturedBaseline, setHasCapturedBaseline] = useState(false);

  // Tab 8: Formats State
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
      includeSeedData: includeSeedDataInExport,
      includeTriggers: includeTriggersInExport,
      includeRoutines: includeRoutinesInExport,
      seedRowCount: 5,
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
    includeSeedDataInExport,
    includeTriggersInExport,
    includeRoutinesInExport,
  ]);

  // Roundtrip validation helper
  const handleTestRoundtrip = () => {
    try {
      const res = parseSqlDdl(exportedSql);
      if (res.tables.length > 0) {
        setRoundtripResult({
          success: true,
          message: `✓ Проверка пройдена: ${res.tables.length} таблиц, ${res.relationships.length} связей распознаются без ошибок (${res.detectedDialect || exportDialect})`
        });
      } else {
        setRoundtripResult({
          success: false,
          message: 'Не удалось обнаружить таблицы в сгенерированном SQL. Проверьте настройки экспорта.'
        });
      }
    } catch (err: any) {
      setRoundtripResult({
        success: false,
        message: `Ошибка проверки DDL: ${err?.message || 'Неизвестная ошибка'}`
      });
    }
  };

  // Drag and drop helper
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = (evt.target?.result as string) || '';
        if (content) {
          setImportDdlText(content.replace(/^\uFEFF/, ''));
          setImportError(null);
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  // Clipboard paste helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setImportDdlText(text.replace(/^\uFEFF/, ''));
        setImportError(null);
      }
    } catch {
      // clipboard read fallback
    }
  };

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

  // Intelligent Real-time Dialect Detection for Import
  const detectedSqlInfo: DialectDetectionResult = useMemo(() => {
    return detectSqlDialectDetailed(importDdlText);
  }, [importDdlText]);

  const effectiveImportDialect = manualImportDialect === 'auto' ? detectedSqlInfo.dialect : manualImportDialect;

  // ORM Code Generation
  const prismaCode = useMemo(() => {
    return generatePrismaSchema(schema, { dialect: ormDialect, preserveSnakeCase: ormPreserveSnakeCase });
  }, [schema, ormDialect, ormPreserveSnakeCase]);

  const drizzleCode = useMemo(() => {
    return generateDrizzleSchema(schema, { dialect: ormDialect });
  }, [schema, ormDialect]);

  const typeOrmCode = useMemo(() => {
    return generateTypeOrmSchema(schema);
  }, [schema]);

  const activeOrmCode = useMemo(() => {
    if (ormType === 'prisma') return prismaCode;
    if (ormType === 'drizzle') return drizzleCode;
    return typeOrmCode;
  }, [ormType, prismaCode, drizzleCode, typeOrmCode]);

  // Data Dictionary Markdown
  const dataDictionaryMd = useMemo(() => {
    return generateDataDictionaryMarkdown(schema);
  }, [schema]);

  // Filtered tables for interactive Data Dictionary
  const filteredDictionaryTables = useMemo(() => {
    if (!dictionarySearch.trim()) return schema.tables;
    const query = dictionarySearch.toLowerCase().trim();
    return schema.tables.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.comment && t.comment.toLowerCase().includes(query)) ||
        t.columns.some((c) => c.name.toLowerCase().includes(query) || (c.comment && c.comment.toLowerCase().includes(query)))
    );
  }, [schema.tables, dictionarySearch]);

  // Visual Schema Diff
  const schemaDiff = useMemo(() => {
    return calculateSchemaDiff(baselineSchema, schema, migrationDialect);
  }, [baselineSchema, schema, migrationDialect]);

  // Tab 2: Enhanced DDL Inspection & Resilient Parsing
  const ddlInspection = useMemo(() => {
    if (!importDdlText.trim()) return null;
    return inspectSqlDdlStatements(importDdlText);
  }, [importDdlText]);

  // Parsed DDL Preview in Tab 2
  const parsedDdlPreview = useMemo(() => {
    if (!importDdlText.trim()) return null;
    try {
      // Use cleanSql which has isolated comments and normalized DELIMITERs
      const sqlToParse = ddlInspection?.cleanSql || importDdlText;
      const res = parseSqlDdl(sqlToParse);
      return res;
    } catch {
      return null;
    }
  }, [importDdlText, ddlInspection]);

  // Baseline Snapshot Handler
  const handleCaptureBaseline = () => {
    setBaselineSchema(JSON.parse(JSON.stringify(schema)));
    setHasCapturedBaseline(true);
  };

  if (!isOpen) return null;

  // Handlers for Import DDL
  const handleApplyImportDdl = () => {
    if (!importDdlText.trim()) {
      setImportError('Введите SQL DDL скрипт для импорта или выберите готовый пример');
      return;
    }

    try {
      const sqlToParse = ddlInspection?.cleanSql || importDdlText;
      const parsed = parseSqlDdl(sqlToParse);
      if (parsed.tables.length === 0) {
        const upper = importDdlText.toUpperCase();
        if (upper.includes('INSERT INTO')) {
          setImportError('Обнаружены данные INSERT INTO, но операторы CREATE TABLE не найдены. Добавьте CREATE TABLE или нажмите на пресет E-Commerce DB.');
        } else if (upper.includes('SELECT')) {
          setImportError('Обнаружен SQL-запрос SELECT. Перейдите во вкладку «AI & Запрос в схему» или добавьте операторы CREATE TABLE.');
        } else if (ddlInspection && ddlInspection.counts.delimiters > 0) {
          setImportError(`Обнаружены команды DELIMITER (${ddlInspection.delimitersFound.join(', ')}), но операторы CREATE TABLE не найдены. Проверьте закрывающие скобки и синтаксис таблиц.`);
        } else {
          setImportError('Не удалось обнаружить операторы CREATE TABLE. Проверьте синтаксис (например: CREATE TABLE my_table (id INT PRIMARY KEY, name VARCHAR(100));).');
        }
        return;
      }

      setImportError(null);

      // Auto-detect and set dialect
      const detectedDialect = effectiveImportDialect || parsed.detectedDialect || schema.dialect;
      const detectedName = parsed.databaseName || (importMode === 'replace' ? 'Imported_Database' : schema.name);

      const commentDetail = ddlInspection?.counts.commentLines
        ? ` (${ddlInspection.counts.commentLines} строк коммент. обработано)`
        : '';
      const delimDetail = ddlInspection?.delimitersFound.length
        ? `, DELIMITER ${ddlInspection.delimitersFound.join(', ')} обработан`
        : '';

      if (importMode === 'replace') {
        setSchema((prev) => ({
          ...prev,
          name: detectedName,
          dialect: detectedDialect,
          tables: parsed.tables,
          relationships: parsed.relationships,
          triggers: parsed.triggers,
          routines: parsed.routines,
          queries: parsed.queries,
          version: prev.version + 1,
        }));
        onRecordChange(
          `Импорт DDL: ${detectedName} (${detectedDialect})`,
          `Успешно импортировано: ${parsed.tables.length} таблиц, ${parsed.relationships.length} связей` +
            (parsed.triggers?.length ? `, ${parsed.triggers.length} триггеров` : '') +
            (parsed.routines?.length ? `, ${parsed.routines.length} процедур` : '') +
            commentDetail +
            delimDetail +
            (parsed.inferredFromInserts ? ' (структура восстановлена из данных INSERT)' : ''),
          'table_created'
        );
      } else {
        // Merge
        setSchema((prev) => {
          const existingNames = new Set(prev.tables.map((t) => t.name.toLowerCase()));
          const newTables = parsed.tables.filter((t) => !existingNames.has(t.name.toLowerCase()));
          return {
            ...prev,
            dialect: detectedDialect,
            tables: [...prev.tables, ...newTables],
            relationships: [...prev.relationships, ...parsed.relationships],
            triggers: [...(prev.triggers || []), ...(parsed.triggers || [])],
            routines: [...(prev.routines || []), ...(parsed.routines || [])],
            queries: [...(prev.queries || []), ...(parsed.queries || [])],
            version: prev.version + 1,
          };
        });
        onRecordChange(
          `Импорт DDL (Слияние) - ${detectedDialect}`,
          `Добавлено ${parsed.tables.length} таблиц и ${parsed.relationships.length} связей` +
            commentDetail +
            delimDetail,
          'table_created'
        );
      }

      onClose();
    } catch (err: any) {
      setImportError(`Ошибка парсинга: ${err?.message || 'Некорректный синтаксис DDL'}`);
    }
  };

  // Sample DDL loader for easy testing
  const handleLoadSampleDdl = (type: 'ecommerce' | 'car_rental' | 'crm' | 'marketplace' | 'fintech') => {
    setImportError(null);
    if (type === 'ecommerce') {
      setImportDdlText(DEFAULT_ECOMMERCE_SQL);
    } else if (type === 'car_rental') {
      setImportDdlText(DEFAULT_CAR_RENTAL_SQL);
    } else if (type === 'crm') {
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'importDdl'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Upload className="w-4 h-4" />
              Импорт DDL
            </button>

            <button
              onClick={() => setActiveTab('orm')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'orm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Code className="w-4 h-4 text-indigo-400" />
              <span>ORM Схемы</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                activeTab === 'orm' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}>
                Prisma/Drizzle
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dictionary')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'dictionary'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Словарь данных</span>
            </button>

            <button
              onClick={() => setActiveTab('migrations')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'migrations'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <GitCompare className="w-4 h-4 text-amber-500" />
              <span>Миграции & Diff</span>
            </button>

            <button
              onClick={() => setActiveTab('seed')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'seed'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Seed Данные
            </button>

            <button
              onClick={() => setActiveTab('aiGen')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'aiGen'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              AI Архитектор
            </button>

            <button
              onClick={() => setActiveTab('formats')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'formats'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              Mermaid / DBML / JSON
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pr-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            v2.0 Готово
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Целевой диалект
                    </label>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                      Схема: {schema.dialect || 'PostgreSQL'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(['PostgreSQL', 'MySQL', 'SQLite', 'MSSQL', 'Oracle'] as SqlDialect[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setExportDialect(d)}
                        className={`flex-1 min-w-[65px] px-2 py-1.5 rounded-lg text-xs font-semibold text-center border transition-all ${
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

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeSeedDataInExport}
                        onChange={(e) => setIncludeSeedDataInExport(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Включить тестовые данные (Seed INSERT)</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTriggersInExport}
                        onChange={(e) => setIncludeTriggersInExport(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Включить триггеры ({schema.triggers?.length || 0})</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeRoutinesInExport}
                        onChange={(e) => setIncludeRoutinesInExport(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Включить процедуры / функции ({schema.routines?.length || 0})</span>
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
                      onClick={handleTestRoundtrip}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors border border-slate-700"
                      title="Проверить совместимость: выполнить обратный парсинг сгенерированного SQL"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                      Проверить DDL
                    </button>
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

                {roundtripResult && (
                  <div
                    className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
                      roundtripResult.success
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : 'bg-rose-950/80 text-rose-300 border-rose-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {roundtripResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      {roundtripResult.message}
                    </span>
                    <button
                      onClick={() => setRoundtripResult(null)}
                      className="text-slate-400 hover:text-white p-0.5 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Вставьте SQL DDL скрипт для обратного инжиниринга
                    </h3>
                    <p className="text-xs text-slate-500">
                      Поддерживаются CREATE TABLE (любые СУБД, кодировки, пробелы в именах, кириллица), связи, триггеры, процедуры и INSERT дампы
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">Примеры:</span>
                    <button
                      onClick={() => handleLoadSampleDdl('ecommerce')}
                      className="px-2.5 py-1 text-xs rounded-md bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1"
                      title="ECommerceDB: Покупатели, Товарлар, Продажи, Детали_продажи (MySQL дампы, триггеры)"
                    >
                      <Database className="w-3 h-3 text-emerald-600" />
                      E-Commerce DB
                    </button>
                    <button
                      onClick={() => handleLoadSampleDdl('car_rental')}
                      className="px-2.5 py-1 text-xs rounded-md bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 font-semibold flex items-center gap-1"
                      title="Car Rental DB: Cars, Clients, Rentals, триггеры и процедуры"
                    >
                      <Database className="w-3 h-3 text-blue-600" />
                      Car Rental
                    </button>
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

                    <div className="h-4 w-px bg-slate-300 mx-1"></div>

                    <button
                      onClick={handlePasteClipboard}
                      className="px-2.5 py-1 text-xs rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1"
                      title="Вставить SQL код из буфера обмена"
                    >
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Вставить</span>
                    </button>

                    <label className="px-2.5 py-1 text-xs rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3 text-slate-500" />
                      <span>Файл .sql</span>
                      <input
                        type="file"
                        accept=".sql,.txt,.ddl"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const content = (evt.target?.result as string) || '';
                              if (content) {
                                setImportDdlText(content.replace(/^\uFEFF/, ''));
                                setImportError(null);
                              }
                            };
                            reader.readAsText(file, 'UTF-8');
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>

                    {importDdlText && (
                      <button
                        onClick={() => {
                          setImportDdlText('');
                          setImportError(null);
                        }}
                        className="px-2 py-1 text-xs rounded-md bg-white border border-slate-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                        title="Очистить поле ввода"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Smart Dialect Auto-detection & Streamlined Settings */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 px-3 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Диалект:
                    </span>

                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-2.5 py-1 rounded-lg">
                      <span className="font-bold">{effectiveImportDialect}</span>
                      {manualImportDialect === 'auto' ? (
                        <span className="text-[10px] bg-blue-200/70 text-blue-800 px-1.5 py-0.2 rounded font-medium">
                          Авто ({detectedSqlInfo.confidence}%)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium">
                          Вручную
                        </span>
                      )}
                    </div>

                    <select
                      value={manualImportDialect}
                      onChange={(e) => setManualImportDialect(e.target.value as any)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-hidden cursor-pointer"
                      title="Переопределить автоопределение диалекта при необходимости"
                    >
                      <option value="auto">✨ Авто ({detectedSqlInfo.dialect})</option>
                      <option value="PostgreSQL">PostgreSQL</option>
                      <option value="MySQL">MySQL 8.0</option>
                      <option value="SQLite">SQLite</option>
                      <option value="MSSQL">MS SQL Server</option>
                      <option value="Oracle">Oracle DB</option>
                    </select>

                    {detectedSqlInfo.matchedTokens.length > 0 && importDdlText.trim() && (
                      <span className="text-[10px] text-slate-500 hidden xl:inline" title={detectedSqlInfo.explanation}>
                        Маркеры: {detectedSqlInfo.matchedTokens.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAstSidebar(!showAstSidebar)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        showAstSidebar
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Показать или свернуть детальный AST анализатор синтаксиса"
                    >
                      <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Dev Mode: AST Инспектор</span>
                      {ddlInspection && ddlInspection.totalStatements > 0 && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">
                          {ddlInspection.totalStatements}
                        </span>
                      )}
                      {showAstSidebar ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Status Banners */}
                {importError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold">{importError}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleLoadSampleDdl('ecommerce')}
                          className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-medium text-[11px]"
                        >
                          Загрузить рабочий пример E-Commerce DB
                        </button>
                        <button
                          onClick={() => handleLoadSampleDdl('car_rental')}
                          className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-medium text-[11px]"
                        >
                          Загрузить рабочий пример Car Rental
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {parsedDdlPreview && parsedDdlPreview.tables.length > 0 && !importError && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <b>Готово к импорту:</b> обнаружено <b>{parsedDdlPreview.tables.length}</b> таблиц,{' '}
                        <b>{parsedDdlPreview.relationships.length}</b> связей (СУБД:{' '}
                        <b>{parsedDdlPreview.detectedDialect || 'Auto'}</b>)
                        {parsedDdlPreview.inferredFromInserts ? ' [структура восстановлена из данных INSERT]' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {ddlInspection && ddlInspection.delimitersFound.length > 0 && (
                        <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-medium" title="Кастомные DELIMITER успешно обработаны">
                          DELIMITER {ddlInspection.delimitersFound.join(', ')}
                        </span>
                      )}
                      {ddlInspection && ddlInspection.counts.commentLines > 0 && (
                        <span className="text-[10px] text-slate-700 bg-slate-200 border border-slate-300 px-1.5 py-0.5 rounded font-mono font-medium" title="Строки комментариев безопасно изолированы">
                          -- {ddlInspection.counts.commentLines} коммент.
                        </span>
                      )}
                      <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">
                        Синтаксис корректен
                      </span>
                    </div>
                  </div>
                )}

                {/* Textarea with Drag & Drop */}
                <div
                  className={`flex-1 relative flex flex-col rounded-xl overflow-hidden border transition-all ${
                    isDraggingFile
                      ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-950/20'
                      : 'border-slate-800'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleFileDrop}
                >
                  <textarea
                    value={importDdlText}
                    onChange={(e) => {
                      setImportDdlText(e.target.value);
                      if (importError) setImportError(null);
                    }}
                    placeholder={`Вставьте SQL DDL скрипт или перетащите .sql файл сюда...

Пример:
CREATE TABLE \`Покупатели\` (
    \`ID_Покупателя\` INT PRIMARY KEY AUTO_INCREMENT,
    \`Имя\` VARCHAR(100) NOT NULL,
    \`Email\` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`Заказы\` (
    \`ID_Заказа\` INT PRIMARY KEY AUTO_INCREMENT,
    \`ID_Покупателя\` INT NOT NULL,
    \`Сумма\` DECIMAL(10,2) NOT NULL,
    CONSTRAINT \`fk_заказы_покупатели\` FOREIGN KEY (\`ID_Покупателя\`) REFERENCES \`Покупатели\` (\`ID_Покупателя\`)
);`}
                    className="flex-1 w-full p-4 font-mono text-xs bg-slate-950 text-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
                  />

                  {isDraggingFile && (
                    <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                      <div className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-lg flex items-center gap-2">
                        <Upload className="w-4 h-4 animate-bounce" />
                        Отпустите файл .sql для загрузки
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-semibold text-slate-700">Режим импорта:</span>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-blue-600"
                      />
                      Заменить текущую схему
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-blue-600"
                      />
                      Объединить со схемой
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApplyImportDdl}
                      disabled={!importDdlText.trim()}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                        importDdlText.trim()
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Импортировать в холст
                      {parsedDdlPreview && parsedDdlPreview.tables.length > 0
                        ? ` (${parsedDdlPreview.tables.length} табл.)`
                        : ''}
                    </button>
                  </div>
                </div>
              </div>

              {/* Live AST Preview Sidebar (Collapsible Dev Mode) */}
              {showAstSidebar && (
                <div className="w-full md:w-80 border-l border-slate-200 bg-white p-4 overflow-y-auto space-y-4 animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    AST Анализатор синтаксиса
                  </h4>
                  {parsedDdlPreview && parsedDdlPreview.tables.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      Найдено: {parsedDdlPreview.tables.length} табл.
                    </span>
                  )}
                </div>

                {/* DDL Operator Analysis & Statistics */}
                {ddlInspection && ddlInspection.totalStatements > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        DDL Операторы ({ddlInspection.totalStatements})
                      </span>
                      {ddlInspection.detectedOperatorsList.length > 0 && (
                        <button
                          onClick={() => setShowDdlOperatorList(!showDdlOperatorList)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                        >
                          {showDdlOperatorList ? 'Скрыть' : 'Детали'}
                        </button>
                      )}
                    </div>

                    {/* Operator Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                        CREATE TABLE: {ddlInspection.counts.createTable}
                      </span>
                      {ddlInspection.counts.alterTable > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-medium border border-blue-200">
                          ALTER TABLE: {ddlInspection.counts.alterTable}
                        </span>
                      )}
                      {ddlInspection.counts.triggers > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-medium border border-amber-200">
                          Триггеры: {ddlInspection.counts.triggers}
                        </span>
                      )}
                      {ddlInspection.counts.routines > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-medium border border-indigo-200">
                          Процедуры: {ddlInspection.counts.routines}
                        </span>
                      )}
                      {ddlInspection.counts.views > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-medium border border-purple-200">
                          Views: {ddlInspection.counts.views}
                        </span>
                      )}
                      {ddlInspection.delimitersFound.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 font-mono font-medium border border-violet-200" title="Кастомные DELIMITER успешно обработаны">
                          DELIMITER {ddlInspection.delimitersFound.join(', ')}
                        </span>
                      )}
                      {ddlInspection.counts.commentLines > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono font-medium border border-slate-300" title="Комментарии (--) изолированы">
                          -- {ddlInspection.counts.commentLines}
                        </span>
                      )}
                    </div>

                    {/* Expandable DDL Operators List */}
                    {showDdlOperatorList && ddlInspection.detectedOperatorsList.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1 pt-1.5 border-t border-slate-200">
                        {ddlInspection.detectedOperatorsList.map((op, idx) => (
                          <div key={idx} className="p-1.5 rounded bg-white border border-slate-200 text-[10px] flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold ${
                                op.type === 'CREATE TABLE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : op.type === 'ALTER TABLE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : op.type === 'TRIGGER'
                                  ? 'bg-amber-100 text-amber-800'
                                  : op.type === 'ROUTINE'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {op.type}
                              </span>
                              <span className="font-bold text-slate-800 truncate">{op.name}</span>
                            </div>
                            {op.details && (
                              <span className="text-[9px] text-slate-400 truncate max-w-[90px] ml-1">{op.details}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!parsedDdlPreview || parsedDdlPreview.tables.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-3">
                    <Database className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>
                      <p className="font-semibold text-slate-600">Ожидание SQL кода</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Вставьте код слева или нажмите готовый пример:
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-2">
                      <button
                        onClick={() => handleLoadSampleDdl('ecommerce')}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium text-left flex items-center justify-between"
                      >
                        <span>E-Commerce DB (MySQL)</span>
                        <ArrowRight className="w-3 h-3 text-emerald-600" />
                      </button>
                      <button
                        onClick={() => handleLoadSampleDdl('car_rental')}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-medium text-left flex items-center justify-between"
                      >
                        <span>Car Rental DB (Связи, триггеры)</span>
                        <ArrowRight className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Целевая СУБД:</span>
                        <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                          {parsedDdlPreview.detectedDialect || 'PostgreSQL'}
                        </span>
                      </div>
                      {parsedDdlPreview.databaseName && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">База данных:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {parsedDdlPreview.databaseName}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-blue-100">
                        <span>Таблиц: <b>{parsedDdlPreview.tables.length}</b></span>
                        <span>Связей: <b>{parsedDdlPreview.relationships.length}</b></span>
                        {parsedDdlPreview.seedInsertsCount ? (
                          <span>INSERT: <b>{parsedDdlPreview.seedInsertsCount}</b></span>
                        ) : null}
                      </div>
                    </div>

                    {parsedDdlPreview.triggers && parsedDdlPreview.triggers.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs">
                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                          Триггеры ({parsedDdlPreview.triggers.length})
                        </span>
                        <div className="space-y-1">
                          {parsedDdlPreview.triggers.map((trg) => (
                            <div key={trg.name} className="p-1.5 rounded bg-white border border-amber-200 text-[11px]">
                              <div className="font-bold text-amber-900 font-mono">{trg.name}</div>
                              <div className="text-[10px] text-slate-500">Таблица: {trg.targetTable} ({trg.timing})</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {parsedDdlPreview.routines && parsedDdlPreview.routines.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-xs">
                        <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block mb-1">
                          Процедуры / Функции ({parsedDdlPreview.routines.length})
                        </span>
                        <div className="space-y-1">
                          {parsedDdlPreview.routines.map((rt) => (
                            <div key={rt.name} className="p-1.5 rounded bg-white border border-indigo-200 text-[11px]">
                              <div className="font-bold text-indigo-900 font-mono">{rt.name}()</div>
                              <div className="text-[10px] text-slate-500">{rt.description || rt.type}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Таблицы схемы ({parsedDdlPreview.tables.length})
                      </span>
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
                          Обнаруженные Foreign Keys ({parsedDdlPreview.relationships.length})
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

                    <button
                      onClick={handleApplyImportDdl}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Импортировать {parsedDdlPreview.tables.length} таблиц
                    </button>
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {/* TAB 3: ORM СХЕМЫ (PRISMA / DRIZZLE / TYPEORM) */}
          {activeTab === 'orm' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Control Sidebar */}
              <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50/70 p-4 overflow-y-auto space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    ORM Фреймворк
                  </label>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setOrmType('prisma')}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all cursor-pointer ${
                        ormType === 'prisma'
                          ? 'bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="font-bold">Prisma ORM</div>
                        <div className={`text-[10px] ${ormType === 'prisma' ? 'text-indigo-100' : 'text-slate-400'}`}>
                          schema.prisma (Next.js, NestJS)
                        </div>
                      </div>
                      <Code className="w-4 h-4 opacity-80" />
                    </button>

                    <button
                      onClick={() => setOrmType('drizzle')}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all cursor-pointer ${
                        ormType === 'drizzle'
                          ? 'bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="font-bold">Drizzle ORM</div>
                        <div className={`text-[10px] ${ormType === 'drizzle' ? 'text-indigo-100' : 'text-slate-400'}`}>
                          schema.ts (Легковесный TypeScript)
                        </div>
                      </div>
                      <Sparkles className="w-4 h-4 opacity-80" />
                    </button>

                    <button
                      onClick={() => setOrmType('typeorm')}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all cursor-pointer ${
                        ormType === 'typeorm'
                          ? 'bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="font-bold">TypeORM</div>
                        <div className={`text-[10px] ${ormType === 'typeorm' ? 'text-indigo-100' : 'text-slate-400'}`}>
                          entities.ts (Классы & Декораторы)
                        </div>
                      </div>
                      <Layers className="w-4 h-4 opacity-80" />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    Целевой диалект БД
                  </label>
                  <select
                    value={ormDialect}
                    onChange={(e) => setOrmDialect(e.target.value as SqlDialect)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="MySQL">MySQL / MariaDB</option>
                    <option value="SQLite">SQLite</option>
                    <option value="MSSQL">MS SQL Server</option>
                  </select>
                </div>

                {ormType === 'prisma' && (
                  <div className="pt-3 border-t border-slate-200">
                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={ormPreserveSnakeCase}
                        onChange={(e) => setOrmPreserveSnakeCase(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Сохранять snake_case имена</span>
                    </label>
                  </div>
                )}

                {/* Info Card */}
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    Готовые модели в 1 клик
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    {ormType === 'prisma'
                      ? 'Сгенерированы модели с @id, @relation, @default, @unique и типами данных. Скопируйте в schema.prisma и выполните npx prisma db push.'
                      : ormType === 'drizzle'
                      ? 'Сгенерированы pgTable/mysqlTable со связями relations() и полной TypeScript типизацией.'
                      : 'Сгенерированы классы сущностей с декораторами @Entity, @PrimaryGeneratedColumn, @Column и связями @ManyToOne.'}
                  </p>
                </div>
              </div>

              {/* Right Code Area */}
              <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2 font-mono text-indigo-300">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    <span>
                      {ormType === 'prisma'
                        ? 'schema.prisma'
                        : ormType === 'drizzle'
                        ? 'schema.ts'
                        : 'entities.ts'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {schema.tables.length} моделей · {schema.relationships.length} связей
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(activeOrmCode)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Скопировано!' : 'Копировать'}
                    </button>
                    <button
                      onClick={() =>
                        downloadTextFile(
                          activeOrmCode,
                          ormType === 'prisma'
                            ? 'schema.prisma'
                            : ormType === 'drizzle'
                            ? 'schema.ts'
                            : 'entities.ts'
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-emerald-300 leading-relaxed selection:bg-indigo-600 selection:text-white">
                  <pre>{activeOrmCode}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: СЛОВАРЬ ДАННЫХ (DATA DICTIONARY) */}
          {activeTab === 'dictionary' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
              {/* Toolbar */}
              <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={dictionarySearch}
                      onChange={(e) => setDictionarySearch(e.target.value)}
                      placeholder="Поиск по таблицам, колонкам и описаниям..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {dictionarySearch && (
                    <button
                      onClick={() => setDictionarySearch('')}
                      className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer"
                    >
                      Сброс
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      onClick={() => setDictionaryViewMode('table')}
                      className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        dictionaryViewMode === 'table'
                          ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Табличный вид
                    </button>
                    <button
                      onClick={() => setDictionaryViewMode('markdown')}
                      className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        dictionaryViewMode === 'markdown'
                          ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Markdown спецификация
                    </button>
                  </div>

                  <button
                    onClick={() => handleCopy(dataDictionaryMd)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Копировать MD
                  </button>

                  <button
                    onClick={() => downloadTextFile(dataDictionaryMd, 'data-dictionary.md')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Скачать .md
                  </button>
                </div>
              </div>

              {/* Body */}
              {dictionaryViewMode === 'markdown' ? (
                <div className="flex-1 p-4 bg-slate-950 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
                  <pre>{dataDictionaryMd}</pre>
                </div>
              ) : (
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  {filteredDictionaryTables.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      По запросу «{dictionarySearch}» ничего не найдено.
                    </div>
                  ) : (
                    filteredDictionaryTables.map((table) => {
                      const tableRels = schema.relationships.filter(
                        (r) => r.sourceTableId === table.id || r.targetTableId === table.id
                      );
                      return (
                        <div key={table.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          {/* Table Header */}
                          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: table.color || '#3b82f6' }} />
                              <span className="font-bold text-sm text-slate-900 font-mono">{table.name}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                                {table.columns.length} колонок
                              </span>
                              {tableRels.length > 0 && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                                  {tableRels.length} связей
                                </span>
                              )}
                            </div>
                            {table.comment && (
                              <span className="text-xs text-slate-500 italic max-w-md truncate">
                                {table.comment}
                              </span>
                            )}
                          </div>

                          {/* Columns Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-100/70 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-2">Колонка</th>
                                  <th className="px-4 py-2">Тип данных</th>
                                  <th className="px-4 py-2">Null</th>
                                  <th className="px-4 py-2">Ключи & Ограничения</th>
                                  <th className="px-4 py-2">По умолчанию</th>
                                  <th className="px-4 py-2">Описание / Назначение</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {table.columns.map((col) => {
                                  return (
                                    <tr key={col.id} className="hover:bg-slate-50/60 transition-colors">
                                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                                        {col.name}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-blue-700">
                                        {col.type}{col.lengthOrPrecision ? `(${col.lengthOrPrecision})` : ''}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        {col.isNullable ? (
                                          <span className="text-slate-400">NULL</span>
                                        ) : (
                                          <span className="font-bold text-rose-600">NOT NULL</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                          {col.isPk && (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center gap-0.5">
                                              🔑 PK
                                            </span>
                                          )}
                                          {col.isFk && (
                                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-medium text-[10px] flex items-center gap-0.5">
                                              🔗 FK
                                            </span>
                                          )}
                                          {col.isUnique && !col.isPk && (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-medium text-[10px]">
                                              ⚡ Unique
                                            </span>
                                          )}
                                          {!col.isPk && !col.isFk && !col.isUnique && (
                                            <span className="text-slate-400">-</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-slate-500">
                                        {col.defaultValue ? (
                                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">{col.defaultValue}</span>
                                        ) : (
                                          '-'
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-600">
                                        {col.comment || <span className="text-slate-300 italic">Нет описания</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Outgoing Relations Footer */}
                          {(() => {
                            const outgoing = schema.relationships.filter((r) => r.sourceTableId === table.id);
                            if (outgoing.length === 0) return null;
                            return (
                              <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap gap-3">
                                <span className="font-semibold text-slate-700">Внешние ключи:</span>
                                {outgoing.map((r) => {
                                  const tgtT = schema.tables.find((t) => t.id === r.targetTableId);
                                  const sCol = table.columns.find((c) => c.id === r.sourceColumnId);
                                  const tCol = tgtT?.columns.find((c) => c.id === r.targetColumnId);
                                  return (
                                    <span key={r.id} className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                                      <b>{sCol?.name}</b> ➔ {tgtT?.name}.<b>{tCol?.name}</b> (DEL: {r.onDelete || 'CASCADE'})
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SEED MOCK ДАННЫЕ (INSERT) */}
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

                {/* Baseline Snapshot Controls */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Снимок Baseline
                    </span>
                    <button
                      onClick={handleCaptureBaseline}
                      className="px-2.5 py-1 text-[11px] rounded-md bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Зафиксировать текущее состояние схемы как базу для сравнения"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      Зафиксировать
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Базовых таблиц:</span>
                      <span className="font-semibold">{baselineSchema.tables.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Текущих таблиц:</span>
                      <span className="font-semibold text-blue-600">{schema.tables.length}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-100 text-[10px]">
                      {schemaDiff.hasChanges ? (
                        <span className="text-amber-600 font-medium">
                          Обнаружены изменения (+{schemaDiff.addedTables.length} новых, {schemaDiff.modifiedTables.length} изм.)
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">✓ Схема совпадает с базовым снимком</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    Режим просмотра
                  </label>
                  <div className="flex flex-col gap-1 text-xs font-semibold">
                    <button
                      onClick={() => setMigrationTab('diff')}
                      className={`w-full py-2 px-3 rounded-lg text-left flex items-center justify-between transition-all cursor-pointer ${
                        migrationTab === 'diff' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <GitCompare className="w-3.5 h-3.5" />
                        Visual Diff & Сравнение
                      </span>
                      {schemaDiff.hasChanges && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${migrationTab === 'diff' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                          Diff!
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setMigrationTab('up')}
                      className={`w-full py-2 px-3 rounded-lg text-left flex items-center justify-between transition-all cursor-pointer ${
                        migrationTab === 'up' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>UP Миграция (Накат)</span>
                      <span className="text-[10px] opacity-75">V1__init</span>
                    </button>
                    <button
                      onClick={() => setMigrationTab('down')}
                      className={`w-full py-2 px-3 rounded-lg text-left flex items-center justify-between transition-all cursor-pointer ${
                        migrationTab === 'down' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>DOWN Откат (Rollback)</span>
                      <span className="text-[10px] opacity-75">Drop</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Migrations / Diff Area */}
              {migrationTab === 'diff' ? (
                <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold text-white">Visual Schema Diff & ALTER Скрипт</span>
                      {schemaDiff.hasChanges ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          Есть изменения
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Идентично
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(schemaDiff.migrationSql)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Копировать SQL
                      </button>
                      <button
                        onClick={() => downloadTextFile(schemaDiff.migrationSql, 'schema_diff_migration.sql')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Скачать .sql
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Visual Change Cards */}
                    <div className="w-full md:w-96 border-r border-slate-800 bg-slate-950 p-4 overflow-y-auto space-y-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Сводка изменений
                      </div>

                      {!schemaDiff.hasChanges ? (
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 space-y-2">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                          <p className="font-semibold text-slate-300">Изменений структуры нет</p>
                          <p className="text-[11px] text-slate-500">
                            Текущая схема совпадает с базовым снимком. Внесите изменения в редакторе (добавьте таблицу или колонку), чтобы увидеть diff.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Added Tables */}
                          {schemaDiff.addedTables.map((t) => (
                            <div key={t.id} className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs">
                              <div className="flex items-center justify-between text-emerald-300 font-bold">
                                <span>+ Новая таблица: {t.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-800 text-white">ADD</span>
                              </div>
                              <div className="text-[11px] text-emerald-400/80 mt-1">
                                {t.columns.length} колонок ({t.columns.map((c) => c.name).join(', ')})
                              </div>
                            </div>
                          ))}

                          {/* Modified Tables */}
                          {schemaDiff.modifiedTables.map((m) => (
                            <div key={m.table.id} className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800/80 text-xs space-y-1.5">
                              <div className="flex items-center justify-between text-amber-300 font-bold">
                                <span>~ Модификация: {m.table.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-800 text-white">ALTER</span>
                              </div>
                              {m.addedColumns.map((c) => (
                                <div key={c.id} className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                                  <span>+ ADD COLUMN {c.name} ({c.type})</span>
                                </div>
                              ))}
                              {m.modifiedColumns.map((mc) => (
                                <div key={mc.newCol.id} className="text-[11px] text-amber-400 flex items-center gap-1 font-mono">
                                  <span>~ ALTER {mc.newCol.name} ({mc.oldCol.type} ➔ {mc.newCol.type})</span>
                                </div>
                              ))}
                              {m.removedColumns.map((c) => (
                                <div key={c.id} className="text-[11px] text-rose-400 flex items-center gap-1 font-mono">
                                  <span>- DROP COLUMN {c.name}</span>
                                </div>
                              ))}
                            </div>
                          ))}

                          {/* Added Relationships */}
                          {schemaDiff.addedRelationships.map((r) => {
                            const srcT = schema.tables.find((t) => t.id === r.sourceTableId)?.name;
                            const tgtT = schema.tables.find((t) => t.id === r.targetTableId)?.name;
                            return (
                              <div key={r.id} className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-800/80 text-xs">
                                <div className="text-blue-300 font-bold">+ Внешний ключ (FK)</div>
                                <div className="text-[11px] text-blue-400/80 mt-0.5 font-mono">
                                  {srcT} ➔ {tgtT}
                                </div>
                              </div>
                            );
                          })}

                          {/* Removed Tables */}
                          {schemaDiff.removedTables.map((t) => (
                            <div key={t.id} className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs">
                              <div className="flex items-center justify-between text-rose-300 font-bold">
                                <span>- Удалена таблица: {t.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-800 text-white">DROP</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SQL Script Panel */}
                    <div className="flex-1 p-4 bg-slate-950 overflow-auto font-mono text-xs text-emerald-300 leading-relaxed selection:bg-blue-600 selection:text-white">
                      <pre>{schemaDiff.migrationSql}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-mono text-emerald-400">
                      {migrationTab === 'up' ? migrationData.filename : `rollback_${migrationData.filename}`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(migrationTab === 'up' ? migrationData.upSql : migrationData.downSql)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Копировать
                      </button>
                      <button
                        onClick={() =>
                          downloadTextFile(
                            migrationTab === 'up' ? migrationData.upSql : migrationData.downSql,
                            migrationTab === 'up' ? migrationData.filename : `rollback_${migrationData.filename}`
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
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
              )}
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
