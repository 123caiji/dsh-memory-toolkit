/**
 * graph-memory
 *
 */
import type { GmConfig, ExtractionResult, FinalizeResult } from '../types.ts';
import type { CompleteFn } from '../engine/llm.ts';
export declare class Extractor {
    private _cfg;
    private llm;
    constructor(_cfg: GmConfig, llm: CompleteFn);
    extract(params: {
        messages: any[];
        existingNames: string[];
    }): Promise<ExtractionResult>;
    finalize(params: {
        sessionNodes: any[];
        graphSummary: string;
    }): Promise<FinalizeResult>;
    private parseExtract;
    private parseFinalize;
}
