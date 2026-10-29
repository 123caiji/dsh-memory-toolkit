/**
 * graph-memory
 *
 */
import { type DatabaseSyncInstance } from '@photostructure/sqlite';
import type { GmNode, GmEdge } from '../types.ts';
/**
 * 构建知识图谱的 system prompt 引导文字
 */
export declare function buildSystemPromptAddition(params: {
    selectedNodes: Array<{
        type: string;
        src: 'active' | 'recalled';
    }>;
    edgeCount: number;
}): string;
/**
 * 组装知识图谱为 XML context
 */
export declare function assembleContext(db: DatabaseSyncInstance, params: {
    tokenBudget: number;
    activeNodes: GmNode[];
    activeEdges: GmEdge[];
    recalledNodes: GmNode[];
    recalledEdges: GmEdge[];
}): {
    xml: string | null;
    systemPrompt: string;
    tokens: number;
    episodicXml: string;
    episodicTokens: number;
};
