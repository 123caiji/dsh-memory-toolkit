/**
 * graph-memory — Personalized PageRank (PPR)
 *
 *
 * ═══════════════════════════════════════════════════════════════
 * 个性化 PageRank（Personalized PageRank）
 *
 * 区别于全局 PageRank：
 *   全局 PR：所有节点均匀起步，算一个固定的全局排名
 *   个性化 PPR：从用户查询命中的种子节点出发，沿边传播权重
 *              离种子越近的节点分数越高
 *
 * 同一个图谱：
 *   问 "Docker 部署"   → Docker 相关 SKILL 分数最高
 *   问 "conda 环境"    → conda 相关 SKILL 分数最高
 *   问 "bilibili 爬虫" → bilibili 相关 TASK/SKILL 分数最高
 *
 * 计算时机：
 *   recall 时实时算（不存数据库），每次查询都是新鲜的
 *   O(iterations * edges)，几千节点 < 5ms
 *
 * 另外保留一个全局 PageRank 作为基线，用于：
 *   - topNodes 兜底（没有种子时）
 *   - session_end 时写入 gm_nodes.pagerank 列
 * ═══════════════════════════════════════════════════════════════
 */
import { type DatabaseSyncInstance } from '@photostructure/sqlite';
import type { GmConfig } from '../types.ts';
/** 图结构变化时清除缓存（compact/finalize 后调用） */
export declare function invalidateGraphCache(): void;
export interface PPRResult {
    /** nodeId → 个性化分数 */
    scores: Map<string, number>;
}
/**
 * 个性化 PageRank
 *
 * 从 seedIds 出发传播权重：
 *   - teleport 概率 (1-damping) 总是回到种子节点（不是均匀回到所有节点）
 *   - 这样种子附近的节点天然获得更高分数
 *
 * @param seedIds  用户查询命中的种子节点（FTS5/向量搜索结果）
 * @param candidateIds  需要排序的候选节点（图遍历结果）
 * @returns 候选节点的个性化分数
 */
export declare function personalizedPageRank(db: DatabaseSyncInstance, seedIds: string[], candidateIds: string[], cfg: GmConfig): PPRResult;
export interface GlobalPageRankResult {
    scores: Map<string, number>;
    topK: Array<{
        id: string;
        name: string;
        score: number;
    }>;
}
/**
 * 全局 PageRank — 写入 gm_nodes.pagerank 作为基线
 *
 * 用途：
 *   - topNodes 兜底排序（没有查询种子时的 fallback）
 *   - gm_stats 展示全局重要节点
 *
 * 只在 session_end / gm_maintain 时调用
 */
export declare function computeGlobalPageRank(db: DatabaseSyncInstance, cfg: GmConfig): GlobalPageRankResult;
