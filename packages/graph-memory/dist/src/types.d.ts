/**
 * graph-memory
 *
 */
/**
 * graph-memory 类型定义
 *
 * 节点：TASK / SKILL / EVENT
 * 边：USED_SKILL / SOLVED_BY / REQUIRES / PATCHES / CONFLICTS_WITH
 */
export type NodeType = 'TASK' | 'SKILL' | 'EVENT';
export type NodeStatus = 'active' | 'deprecated';
export interface GmNode {
    id: string;
    type: NodeType;
    name: string;
    description: string;
    content: string;
    status: NodeStatus;
    validatedCount: number;
    sourceSessions: string[];
    communityId: string | null;
    pagerank: number;
    createdAt: number;
    updatedAt: number;
}
export type EdgeType = 'USED_SKILL' | 'SOLVED_BY' | 'REQUIRES' | 'PATCHES' | 'CONFLICTS_WITH';
export interface GmEdge {
    id: string;
    fromId: string;
    toId: string;
    type: EdgeType;
    instruction: string;
    condition?: string;
    sessionId: string;
    createdAt: number;
}
export type SignalType = 'tool_error' | 'tool_success' | 'skill_invoked' | 'user_correction' | 'explicit_record' | 'task_completed';
export interface Signal {
    type: SignalType;
    turnIndex: number;
    data: Record<string, any>;
}
export interface ExtractionResult {
    nodes: Array<{
        type: NodeType;
        name: string;
        description: string;
        content: string;
    }>;
    edges: Array<{
        from: string;
        to: string;
        type: EdgeType;
        instruction: string;
        condition?: string;
    }>;
}
export interface FinalizeResult {
    promotedSkills: Array<{
        type: 'SKILL';
        name: string;
        description: string;
        content: string;
    }>;
    newEdges: Array<{
        from: string;
        to: string;
        type: EdgeType;
        instruction: string;
    }>;
    invalidations: string[];
}
export interface RecallResult {
    nodes: GmNode[];
    edges: GmEdge[];
    tokenEstimate: number;
}
export interface EmbeddingConfig {
    apiKey?: string;
    /** Runtime-only credential resolver. Host adapters use this to avoid putting secrets in config. */
    apiKeyResolver?: () => Promise<string | undefined>;
    baseURL?: string;
    /** Alias used by OpenClaw and several OpenAI-compatible providers. */
    baseUrl?: string;
    model?: string;
    dimensions?: number;
}
export interface GmConfig {
    dbPath: string;
    compactTurnCount: number;
    recallMaxNodes: number;
    recallMaxDepth: number;
    freshTailCount: number;
    embedding?: EmbeddingConfig;
    llm?: {
        apiKey?: string;
        baseURL?: string;
        /** Alias used by OpenClaw and several OpenAI-compatible providers. */
        baseUrl?: string;
        model?: string;
    };
    /** 向量去重阈值，余弦相似度超过此值视为重复 (0-1) */
    dedupThreshold: number;
    /** PageRank 阻尼系数 */
    pagerankDamping: number;
    /** PageRank 迭代次数 */
    pagerankIterations: number;
}
export declare const DEFAULT_CONFIG: GmConfig;
