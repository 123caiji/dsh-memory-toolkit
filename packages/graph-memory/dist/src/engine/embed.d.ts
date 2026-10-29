/**
 * graph-memory
 *
 */
/**
 * Embedding 服务
 *
 * 可选模块：配了 embedding.apiKey 才启用，否则返回 null → 降级 FTS5
 *
 * 使用 fetch 直接调 OpenAI 兼容 /embeddings 接口（不依赖 openai SDK），
 * 兼容 OpenAI、阿里云 DashScope、MiniMax CodePlan、Jina、Ollama、llama.cpp 等。
 *
 * MiniMax CodePlan 是特例：
 *   - 端点走 anthropic 协议但 embeddings 用 OpenAI 风格变体
 *   - 请求体用 `texts: [...]` + `type: "db" | "query"`（不是 OpenAI 的 `input`）
 *   - 响应字段是 `data[0].vector`（不是 `data[0].embedding`）
 *   - 维度固定 1536，不接受 `dimensions` 参数
 *
 * 内置：429/5xx 重试 3 次 + 10s 超时
 */
import type { EmbeddingConfig } from '../types.ts';
export type EmbedMode = 'db' | 'query';
export type EmbedFn = (text: string, mode?: EmbedMode) => Promise<number[]>;
/**
 * 识别 MiniMax CodePlan 端点。
 * 海外 minimax.io 国内打不开，所以 baseURL 主要是 api.minimaxi.com / minimax.chat。
 */
export declare function isMinimaxEndpoint(baseURL: string): boolean;
export declare function createEmbedFn(cfg: EmbeddingConfig | undefined): Promise<EmbedFn | null>;
