/**
 * graph-memory — 图谱维护
 *
 *
 * 调用时机：session_end（finalize 之后）
 *
 * 执行顺序：
 *   1. 去重（先合并再算分数，避免重复节点干扰排名）
 *   2. 全局 PageRank（基线分数写入 DB，供 topNodes 兜底用）
 *   3. 社区检测（重新划分知识域）
 *   4. 社区描述生成（LLM 为每个社区生成一句话摘要）
 *
 * 注意：个性化 PPR 不在这里跑，它在 recall 时实时计算。
 */
import { type DatabaseSyncInstance } from '@photostructure/sqlite';
import type { GmConfig } from '../types.ts';
import type { CompleteFn } from '../engine/llm.ts';
import type { EmbedFn } from '../engine/embed.ts';
import { type GlobalPageRankResult } from './pagerank.ts';
import { type CommunityResult } from './community.ts';
import { type DedupResult } from './dedup.ts';
export interface MaintenanceResult {
    dedup: DedupResult;
    pagerank: GlobalPageRankResult;
    community: CommunityResult;
    communitySummaries: number;
    durationMs: number;
}
export declare function runMaintenance(db: DatabaseSyncInstance, cfg: GmConfig, llm?: CompleteFn, embedFn?: EmbedFn): Promise<MaintenanceResult>;
