/**
 * graph-memory
 *
 */
import { type DatabaseSyncInstance } from '@photostructure/sqlite';
export declare function resolvePath(p: string): string;
/**
 * Open an independently owned database instance.
 *
 * Host adapters with explicit lifecycles (for example a DSH Cordis fiber)
 * should use this API and close the returned instance from their disposer.
 * The legacy OpenClaw adapter continues to use getDb() below.
 */
export declare function openDb(dbPath: string): DatabaseSyncInstance;
/**
 * Legacy process-wide database accessor retained for OpenClaw compatibility.
 * New host adapters must prefer openDb() so each plugin instance owns its
 * connection and can dispose it without affecting another profile/fiber.
 */
export declare function getDb(dbPath: string): DatabaseSyncInstance;
/** 仅用于测试：关闭并重置单例 */
export declare function closeDb(): void;
