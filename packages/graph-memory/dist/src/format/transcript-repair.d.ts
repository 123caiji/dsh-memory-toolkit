/**
 * graph-memory
 *
 */
/**
 * Tool use/result pairing repair for assembled context.
 *
 * 裁剪消息后修复 tool_use/toolResult 配对，防止 OpenClaw 报 "Message ordering conflict"
 */
type AgentMessageLike = {
    role: string;
    content?: unknown;
    toolCallId?: string;
    toolUseId?: string;
    toolName?: string;
    stopReason?: string;
    isError?: boolean;
    timestamp?: number;
};
export declare function sanitizeToolUseResultPairing<T extends AgentMessageLike>(messages: T[]): T[];
export {};
