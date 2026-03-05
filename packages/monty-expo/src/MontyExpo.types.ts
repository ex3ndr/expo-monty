export type JsMontyObject = unknown;

export type TypingDisplayFormat =
    | "full"
    | "concise"
    | "azure"
    | "json"
    | "jsonlines"
    | "rdjson"
    | "pylint"
    | "gitlab"
    | "github";

export interface ExceptionInfo {
    typeName: string;
    message: string;
}

export interface ExceptionInput {
    type: string;
    message: string;
}

export interface Frame {
    filename: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    functionName?: string;
    sourceLine?: string;
}

export interface MontyOptions {
    scriptName?: string;
    inputs?: string[];
    typeCheck?: boolean;
    typeCheckPrefixCode?: string;
}

export interface ResourceLimits {
    maxAllocations?: number;
    maxDurationSecs?: number;
    maxMemory?: number;
    gcInterval?: number;
    maxRecursionDepth?: number;
}

export interface RunOptions {
    inputs?: Record<string, unknown>;
    limits?: ResourceLimits;
    externalFunctions?: Record<string, unknown>;
}

export interface RunMontyAsyncOptions {
    inputs?: Record<string, JsMontyObject>;
    externalFunctions?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
    limits?: ResourceLimits;
}

export interface StartOptions {
    inputs?: Record<string, unknown>;
    limits?: ResourceLimits;
}

export interface ResumeOptions {
    returnValue?: unknown;
    exception?: ExceptionInput;
}

export interface NameLookupResumeOptions {
    value?: unknown;
}

export interface SnapshotLoadOptions {
    printCallback?: unknown;
}

export interface NameLookupLoadOptions {
    printCallback?: unknown;
}

export type NativeMontyResult =
    | {
          ok: true;
          output: JsMontyObject;
      }
    | {
          ok: false;
          error: ExceptionInfo & {
              traceback?: Frame[];
          };
      };
