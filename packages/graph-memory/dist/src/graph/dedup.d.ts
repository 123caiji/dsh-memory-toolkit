/**
 * graph-memory
 *
 */
/**
 * 向量余弦去重 — 发现并合并语义重复的节点
 *
 * 原理：两个节点的 embedding 余弦相似度 > threshold → 视为重复
 *
 * 例子：
 *   - "conda-env-create" 和 "conda-create-environment" → 同一个技能
 *   - "importerror-libgl1" 和 "libgl-missing-error" → 同一个事件
 *
 * 合并策略：
 *   - 保留 validatedCount 更高的节点
 *   - 合并 sourceSessions
 *   - 迁移边（from/to 都改指向保留节点）
 *   - 被合并节点标记 deprecated
 *
 * 复杂度：O(n²) 比较，n = 有向量的节点数。几千节点 < 50ms。
 */
import { type DatabaseSyncInstance } from '@photostructure/sqlite';
import type { GmConfig } from '../types.ts';
export interface DuplicatePair {
    nodeA: string;
    nodeB: string;
    nameA: string;
    nameB: string;
    similarity: number;
}
export interface DedupResult {
    /** 发现的重复对 */
    pairs: DuplicatePair[];
    /** 实际合并的数量 */
    merged: number;
}
/**
 * 检测重复节点对
 *
 * 需要 embedding 才能工作，没有向量的节点会被跳过。
 * FTS5 名称完全匹配由 store.upsertNode 已处理，这里处理语义重复。
 */
export declare function detectDuplicates(db: DatabaseSyncInstance, cfg: GmConfig): DuplicatePair[];
/**
 * 检测并自动合并重复节点
 *
 * 合并规则：
 *   - 同类型才合并（SKILL+SKILL，EVENT+EVENT）
 *   - 保留 validatedCount 更高的
 *   - validatedCount 相同时保留更新时间更近的
 */
export declare function dedup(db: DatabaseSyncInstance, cfg: GmConfig): DedupResult;
