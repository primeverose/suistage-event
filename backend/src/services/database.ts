import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import { config } from '../config';
import { logger } from '../utils/logger';
import fs from 'fs';

// 創建或打開數據庫
const dbPath = process.env.DATABASE_PATH || './suistage.db';
export const db: BetterSqlite3.Database = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development'
        ? (message) => logger.debug(`SQLite: ${message}`)
        : undefined
});

// SQLite 優化設置
db.pragma('journal_mode = WAL');   // Write-Ahead Logging (提高並發)
db.pragma('synchronous = NORMAL');  // 平衡性能和安全性
db.pragma('cache_size = 10000');    // 10MB 緩存
db.pragma('temp_store = MEMORY');   // 臨時表存在內存

// 初始化數據庫表
export function initDatabase() {
    try {
        logger.info('🗄️  Initializing SQLite database...');
        
        // Events 表
        db.exec(`
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                venue TEXT NOT NULL,
                date INTEGER NOT NULL,
                organizer TEXT NOT NULL,
                total_seats INTEGER NOT NULL,
                available_seats INTEGER NOT NULL,
                price_per_seat INTEGER NOT NULL,
                image_url TEXT,
                is_active INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                synced_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
            )
        `);
        
        // 索引優化
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_events_date 
                ON events(date) WHERE is_active = 1;
            
            CREATE INDEX IF NOT EXISTS idx_events_organizer 
                ON events(organizer);
            
            CREATE INDEX IF NOT EXISTS idx_events_active 
                ON events(is_active);
            
            CREATE INDEX IF NOT EXISTS idx_events_name 
                ON events(name) WHERE is_active = 1;
        `);
        
        // Event Transactions 表
        db.exec(`
            CREATE TABLE IF NOT EXISTS event_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT,
                tx_digest TEXT NOT NULL,
                event_type TEXT NOT NULL,
                sender TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                data TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                FOREIGN KEY (event_id) REFERENCES events(id),
                UNIQUE(tx_digest, event_type)
            )
        `);
        
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_tx_event_id 
                ON event_transactions(event_id);
            
            CREATE INDEX IF NOT EXISTS idx_tx_type 
                ON event_transactions(event_type);
        `);
        
        // Seat Reservations 表
        db.exec(`
            CREATE TABLE IF NOT EXISTS seat_reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT,
                buyer TEXT NOT NULL,
                seat_count INTEGER NOT NULL,
                total_price INTEGER NOT NULL,
                tx_digest TEXT NOT NULL,
                reserved_at INTEGER NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                FOREIGN KEY (event_id) REFERENCES events(id)
            )
        `);
        
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_res_event_id 
                ON seat_reservations(event_id);
            
            CREATE INDEX IF NOT EXISTS idx_res_buyer 
                ON seat_reservations(buyer);
        `);
        
        logger.info('✅ SQLite database initialized successfully');
        
        // 顯示統計信息
        const stats = getDatabaseStats();
        logger.info(`📊 Database stats: ${stats.events.count} events, ${stats.size} MB`);
        
        return true;
    } catch (error) {
        logger.error('❌ Failed to initialize database', { error });
        return false;
    }
}

// 查詢函數（兼容 PostgreSQL 風格的 async 接口）
export async function query(sql: string, params: any[] = []) {
    try {
        const start = Date.now();
        
        // 標準化參數（PostgreSQL 使用 $1, $2，SQLite 使用 ?）
        const sqliteQuery = sql.replace(/\$\d+/g, '?');
        
        const sqlUpper = sqliteQuery.trim().toUpperCase();
        const isSelect = sqlUpper.startsWith('SELECT');
        const isInsert = sqlUpper.includes('INSERT');
        const isUpdate = sqlUpper.includes('UPDATE');
        const isDelete = sqlUpper.includes('DELETE');
        
        let result;
        
        if (isSelect) {
            // SELECT 查詢
            const stmt = db.prepare(sqliteQuery);
            const rows = stmt.all(...params);
            result = { 
                rows, 
                rowCount: rows.length 
            };
        } else if (sqliteQuery.includes('RETURNING')) {
            // 處理 PostgreSQL 的 RETURNING 語法
            // SQLite 不支持 RETURNING，需要分兩步
            
            const mainSql = sqliteQuery.split('RETURNING')[0].trim();
            const stmt = db.prepare(mainSql);
            const info = stmt.run(...params);
            
            if (isInsert) {
                // 獲取剛插入的記錄
                const tableName = mainSql.match(/INSERT INTO (\w+)/i)?.[1];
                if (tableName) {
                    const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
                    const rows = selectStmt.all(info.lastInsertRowid);
                    result = { rows, rowCount: info.changes };
                } else {
                    result = { rows: [], rowCount: info.changes };
                }
            } else {
                result = { rows: [], rowCount: info.changes };
            }
        } else {
            // 其他操作（INSERT, UPDATE, DELETE without RETURNING）
            const stmt = db.prepare(sqliteQuery);
            const info = stmt.run(...params);
            result = { 
                rows: [], 
                rowCount: info.changes 
            };
        }
        
        const duration = Date.now() - start;
        
        // 慢查詢警告
        if (duration > 100) {
            logger.warn('⚠️  Slow query detected', { 
                sql: sqliteQuery.substring(0, 100), 
                duration, 
                rowCount: result.rowCount 
            });
        } else if (duration > 10) {
            logger.debug('Query executed', { duration, rowCount: result.rowCount });
        }
        
        return result;
    } catch (error: any) {
        logger.error('❌ Query error', { 
            sql: sql.substring(0, 100), 
            params, 
            error: error.message 
        });
        throw error;
    }
}

// 事務支持
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const wrappedCallback = async () => {
        // 創建一個兼容的 client 對象
        const client = {
            query: async (sql: string, params: any[]) => {
                return query(sql, params);
            }
        };
        
        return await callback(client);
    };
    
    // SQLite 的事務
    const transactionFn = db.transaction(wrappedCallback);
    return transactionFn();
}

// 數據庫備份
export function backupDatabase(backupPath?: string) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backup = backupPath || `./backups/suistage_${timestamp}.db`;
        
        // 確保備份目錄存在
        const backupDir = backup.substring(0, backup.lastIndexOf('/'));
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        db.backup(backup);
        logger.info(`💾 Database backed up to ${backup}`);
        return backup;
    } catch (error) {
        logger.error('❌ Backup failed', { error });
        throw error;
    }
}

// 數據庫統計
export function getDatabaseStats() {
    try {
        const stats = {
            events: db.prepare('SELECT COUNT(*) as count FROM events').get() as any,
            transactions: db.prepare('SELECT COUNT(*) as count FROM event_transactions').get() as any,
            reservations: db.prepare('SELECT COUNT(*) as count FROM seat_reservations').get() as any,
            size: '0',
            path: dbPath
        };
        
        // 獲取文件大小
        if (fs.existsSync(dbPath)) {
            const stat = fs.statSync(dbPath);
            stats.size = (stat.size / 1024 / 1024).toFixed(2);
        }
        
        return stats;
    } catch (error) {
        logger.error('Failed to get database stats', { error });
        return {
            events: { count: 0 },
            transactions: { count: 0 },
            reservations: { count: 0 },
            size: '0',
            path: dbPath
        };
    }
}

// 數據庫優化（定期運行）
export function optimizeDatabase() {
    try {
        logger.info('🔧 Optimizing database...');
        
        // 分析表
        db.exec('ANALYZE');
        
        // 清理
        db.exec('VACUUM');
        
        // 重建索引
        db.exec('REINDEX');
        
        logger.info('✅ Database optimized');
    } catch (error) {
        logger.error('Optimization failed', { error });
    }
}

// 關閉數據庫
export function closeDatabase() {
    try {
        db.close();
        logger.info('Database connection closed');
    } catch (error) {
        logger.error('Failed to close database', { error });
    }
}

// 啟動時初始化
initDatabase();

// 每小時優化一次（可選）
if (process.env.AUTO_OPTIMIZE === 'true') {
    setInterval(() => {
        optimizeDatabase();
    }, 60 * 60 * 1000); // 1 hour
}

// 優雅退出
process.on('exit', () => {
    closeDatabase();
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT, closing database...');
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, closing database...');
    closeDatabase();
    process.exit(0);
});

export default db;
