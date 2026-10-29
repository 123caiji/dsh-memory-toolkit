/**
 * graph-memory — 跨对话召回
 *
 *
 * 并行双路径召回（两条路径同时跑，合并去重）：
 *
 * 精确路径（向量/FTS5 → 社区扩展 → 图遍历 → PPR 排序）：
 *   找到和当前查询语义相关的具体三元组
 *
 * 泛化路径（社区代表节点 → 图遍历 → PPR 排序）：
 *   提供跨领域的全局概览，覆盖精确路径可能遗漏的知识域
 *
 * 合并策略：精确路径的结果优先（PPR 分数更高），
 *           泛化路径补充精确路径未覆盖的社区。
 */
import { type DatabaseSyncInstance } from '@photostructure/sqlite';
import type { GmConfig, RecallResult, GmNode } from '../types.ts';
import type { EmbedFn } from '../engine/embed.ts';
export declare class Recaller {
    private db;
    private cfg;
    private embed;
    private embeddingFingerprint;
    constructor(db: DatabaseSyncInstance, cfg: GmConfig);
    setEmbedFn(fn: EmbedFn, fingerprint?: string): void;
    recall(query: string): Promise<RecallResult>;
    /**
     * 精确召回：向量/FTS5 找种子 → 社区扩展 → 图遍历 → PPR 排序
     */
    private recallPrecise;
    /**
     * 泛化召回：社区向量搜索 → 取匹配社区的成员 → 图遍历 → PPR 排序
     *
     * 有社区向量时：query vs 社区 embedding 匹配，按相似度排序社区
     * 无社区向量时：fallback 到 communityRepresentatives（按时间取代表节点）
     */
    private recallGeneralized;
    /**
     * 合并两条路径的结果：全部保留，只去重复节点
     */
    private mergeResults;
    private estimateTokens;
    /** 异步同步 embedding，不阻塞主流程 */
    syncEmbed(node: GmNode): Promise<void>;
}
