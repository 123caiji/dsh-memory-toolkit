/**
 * graph-memory
 *
 */
import { type DatabaseSyncInstance } from '@photostructure/sqlite';
import type { GmNode, GmEdge, EdgeType, NodeType, Signal } from '../types.ts';
export declare function findByName(db: DatabaseSyncInstance, name: string): GmNode | null;
export declare function findById(db: DatabaseSyncInstance, id: string): GmNode | null;
export declare function allActiveNodes(db: DatabaseSyncInstance): GmNode[];
export declare function allEdges(db: DatabaseSyncInstance): GmEdge[];
export declare function upsertNode(db: DatabaseSyncInstance, c: {
    type: NodeType;
    name: string;
    description: string;
    content: string;
}, sessionId: string): {
    node: GmNode;
    isNew: boolean;
};
/** 按 name 精确更新 description / content；找不到返回 null（调用方决定报错语义） */
export declare function updateNode(db: DatabaseSyncInstance, name: string, patch: {
    description?: string;
    content?: string;
}): GmNode | null;
export declare function deprecate(db: DatabaseSyncInstance, nodeId: string): void;
/** 合并两个节点：keepId 保留，mergeId 标记 deprecated，边迁移 */
export declare function mergeNodes(db: DatabaseSyncInstance, keepId: string, mergeId: string): void;
/** 批量更新 PageRank 分数 */
export declare function updatePageranks(db: DatabaseSyncInstance, scores: Map<string, number>): void;
/** 批量更新社区 ID */
export declare function updateCommunities(db: DatabaseSyncInstance, labels: Map<string, string>): void;
export declare function upsertEdge(db: DatabaseSyncInstance, e: {
    fromId: string;
    toId: string;
    type: EdgeType;
    instruction: string;
    condition?: string;
    sessionId: string;
}): void;
export declare function edgesFrom(db: DatabaseSyncInstance, id: string): GmEdge[];
export declare function edgesTo(db: DatabaseSyncInstance, id: string): GmEdge[];
export declare function searchNodes(db: DatabaseSyncInstance, query: string, limit?: number): GmNode[];
/** 热门节点：综合 pagerank + validatedCount 排序 */
export declare function topNodes(db: DatabaseSyncInstance, limit?: number): GmNode[];
export declare function graphWalk(db: DatabaseSyncInstance, seedIds: string[], maxDepth: number): {
    nodes: GmNode[];
    edges: GmEdge[];
};
export declare function getBySession(db: DatabaseSyncInstance, sessionId: string): GmNode[];
export declare function saveMessage(db: DatabaseSyncInstance, sid: string, turn: number, role: string, content: unknown): void;
/**
 * Persist one host event exactly once.
 *
 * DSH session events already carry a stable, monotonically increasing seq.
 * Host adapters use that identity instead of the legacy random id so replay,
 * resume and HMR backfill cannot duplicate a message.
 */
export declare function saveMessageOnce(db: DatabaseSyncInstance, eventId: string, sid: string, turn: number, role: string, content: unknown): boolean;
export declare function getMessages(db: DatabaseSyncInstance, sid: string, limit?: number): any[];
export declare function getUnextracted(db: DatabaseSyncInstance, sid: string, limit: number): any[];
export declare function markExtracted(db: DatabaseSyncInstance, sid: string, upToTurn: number): void;
/**
 * 溯源选拉：按 session 拉取 user/assistant 核心对话（跳过 tool/toolResult）
 * 用于 assemble 时补充三元组的原始上下文
 *
 * @param nearTime  优先取时间最接近的消息（节点的 updatedAt）
 * @param maxChars  总字符上限
 */
export declare function getEpisodicMessages(db: DatabaseSyncInstance, sessionIds: string[], nearTime: number, maxChars?: number): Array<{
    sessionId: string;
    turnIndex: number;
    role: string;
    text: string;
    createdAt: number;
}>;
export declare function saveSignal(db: DatabaseSyncInstance, sid: string, s: Signal): void;
export declare function pendingSignals(db: DatabaseSyncInstance, sid: string): Signal[];
export declare function markSignalsDone(db: DatabaseSyncInstance, sid: string): void;
export declare function getStats(db: DatabaseSyncInstance): {
    totalNodes: number;
    byType: Record<string, number>;
    totalEdges: number;
    byEdgeType: Record<string, number>;
    communities: number;
};
export declare function saveVector(db: DatabaseSyncInstance, nodeId: string, content: string, vec: number[]): void;
export declare function getVectorHash(db: DatabaseSyncInstance, nodeId: string): string | null;
export declare function getVectorStats(db: DatabaseSyncInstance): {
    count: number;
    dimensions: number[];
};
/** 获取所有向量（供去重/聚类用） */
export declare function getAllVectors(db: DatabaseSyncInstance): Array<{
    nodeId: string;
    embedding: Float32Array;
}>;
export type ScoredNode = {
    node: GmNode;
    score: number;
};
export declare function vectorSearchWithScore(db: DatabaseSyncInstance, queryVec: number[], limit: number, minScore?: number): ScoredNode[];
/** 兼容旧接口 */
export declare function vectorSearch(db: DatabaseSyncInstance, queryVec: number[], limit: number, minScore?: number): GmNode[];
/**
 * 社区代表节点：每个社区取最近更新的 topN 个节点
 * 用于泛化召回 —— 用户问"做了哪些工作"时按领域返回概览
 */
export declare function communityRepresentatives(db: DatabaseSyncInstance, perCommunity?: number): GmNode[];
export interface CommunitySummary {
    id: string;
    summary: string;
    nodeCount: number;
    memberSignature: string | null;
    createdAt: number;
    updatedAt: number;
}
export declare function upsertCommunitySummary(db: DatabaseSyncInstance, id: string, summary: string, nodeCount: number, embedding?: number[] | Uint8Array, memberSignature?: string): void;
export declare function getCommunitySummary(db: DatabaseSyncInstance, id: string): CommunitySummary | null;
export declare function getCommunitySummaryBySignature(db: DatabaseSyncInstance, memberSignature: string): (CommunitySummary & {
    embedding?: Uint8Array;
}) | null;
export declare function getAllCommunitySummaries(db: DatabaseSyncInstance): CommunitySummary[];
export type ScoredCommunity = {
    id: string;
    summary: string;
    score: number;
    nodeCount: number;
};
/**
 * 社区向量搜索：用 query 向量匹配社区 embedding，返回按相似度排序的社区
 */
export declare function communityVectorSearch(db: DatabaseSyncInstance, queryVec: number[], minScore?: number): ScoredCommunity[];
/**
 * 按社区 ID 列表获取成员节点（按时间倒序）
 */
export declare function nodesByCommunityIds(db: DatabaseSyncInstance, communityIds: string[], perCommunity?: number): GmNode[];
/** 清除已不存在的社区描述 */
export declare function pruneCommunitySummaries(db: DatabaseSyncInstance): number;
