/**
 * graph-memory
 *
 */
import { type DatabaseSyncInstance } from '@photostructure/sqlite';
export interface CommunityResult {
    labels: Map<string, string>;
    /** 社区 ID → 成员节点 ID 列表 */
    communities: Map<string, string[]>;
    count: number;
}
/**
 * 运行 Label Propagation 并写回 gm_nodes.community_id
 *
 * 把有向边当无向边处理（知识关联不分方向）
 */
export declare function detectCommunities(db: DatabaseSyncInstance, maxIter?: number): CommunityResult;
/**
 * 获取同社区的节点 ID 列表
 * recall 时用：找到种子节点 → 拉同社区的其他节点作为补充
 */
export declare function getCommunityPeers(db: DatabaseSyncInstance, nodeId: string, limit?: number): string[];
import type { CompleteFn } from '../engine/llm.ts';
import type { EmbedFn } from '../engine/embed.ts';
/**
 * 为所有社区生成 LLM 摘要描述 + embedding 向量
 *
 * 调用时机：runMaintenance → detectCommunities 之后
 */
export declare function summarizeCommunities(db: DatabaseSyncInstance, communities: Map<string, string[]>, llm: CompleteFn, embedFn?: EmbedFn): Promise<number>;
