import {
    Monty as WebMonty,
    MontyComplete as WebMontyComplete,
    MontyError as WebMontyError,
    MontyNameLookup as WebMontyNameLookup,
    MontyRuntimeError as WebMontyRuntimeError,
    MontySnapshot as WebMontySnapshot,
    MontySyntaxError as WebMontySyntaxError
} from "monty-web";
import type {
    Frame,
    MontyOptions,
    NativeMontyProgressResult,
    NativeMontyResult,
    ResumeOptions,
    RunOptions,
    StartOptions
} from "./MontyExpo.types";
import type { NativeMontyExpoModuleType } from "./MontyExpoModule";

type WebProgressState = WebMontySnapshot | WebMontyNameLookup;
type NativeErrorPayload = Extract<NativeMontyResult, { ok: false }>["error"];

type StoredState = {
    scriptName: string;
    state: WebProgressState;
};

const snapshotStore = new Map<string, StoredState>();
let nextSnapshotId = 1;

function nextSnapshotIdString(): string {
    const value = `web-snapshot-${nextSnapshotId}`;
    nextSnapshotId += 1;
    return value;
}

function normalizeMontyOptions(options?: MontyOptions): MontyOptions {
    return {
        scriptName: options?.scriptName,
        inputs: options?.inputs,
        typeCheck: options?.typeCheck,
        typeCheckPrefixCode: options?.typeCheckPrefixCode
    };
}

function normalizeStartOptions(options?: StartOptions): StartOptions {
    return {
        inputs: options?.inputs,
        limits: options?.limits
    };
}

function normalizeRunOptions(options?: RunOptions): RunOptions {
    return {
        inputs: options?.inputs,
        limits: options?.limits,
        externalFunctions: options?.externalFunctions
    };
}

function normalizeResumeOptions(options?: unknown): ResumeOptions | { value?: unknown } {
    if (!options || typeof options !== "object") {
        return {};
    }

    const candidate = options as Record<string, unknown>;
    if ("value" in candidate) {
        return {
            value: candidate.value
        };
    }

    return {
        returnValue: candidate.returnValue,
        exception:
            candidate.exception && typeof candidate.exception === "object"
                ? {
                      type: String((candidate.exception as Record<string, unknown>).type ?? "RuntimeError"),
                      message: String((candidate.exception as Record<string, unknown>).message ?? "")
                  }
                : undefined
    };
}

function ensureTraceback(frames: Frame[] | undefined): Frame[] | undefined {
    if (!frames || frames.length === 0) {
        return undefined;
    }
    return frames;
}

function toNativeError(error: unknown): NativeErrorPayload {
    if (error instanceof WebMontyRuntimeError) {
        return {
            typeName: error.exception.typeName,
            message: error.exception.message,
            traceback: ensureTraceback(error.traceback())
        };
    }
    if (error instanceof WebMontySyntaxError) {
        return {
            typeName: "SyntaxError",
            message: error.exception.message
        };
    }
    if (error instanceof WebMontyError) {
        return {
            typeName: error.exception.typeName,
            message: error.exception.message
        };
    }
    if (error instanceof Error) {
        return {
            typeName: error.name || "RuntimeError",
            message: error.message
        };
    }
    return {
        typeName: "RuntimeError",
        message: String(error)
    };
}

function toNativeRunError(error: unknown): NativeMontyResult {
    return {
        ok: false,
        error: toNativeError(error)
    };
}

function toNativeProgressError(error: unknown): NativeMontyProgressResult {
    return {
        ok: false,
        error: toNativeError(error)
    };
}

function mapProgressResult(
    progress: WebMontySnapshot | WebMontyNameLookup | WebMontyComplete,
    scriptName: string
): NativeMontyProgressResult {
    if (progress instanceof WebMontyComplete) {
        return {
            ok: true,
            state: "complete",
            output: progress.output
        };
    }

    const snapshotId = nextSnapshotIdString();
    snapshotStore.set(snapshotId, {
        scriptName,
        state: progress
    });

    if (progress instanceof WebMontySnapshot) {
        return {
            ok: true,
            state: "functionCall",
            snapshotId,
            scriptName,
            functionName: progress.functionName,
            args: progress.args,
            kwargs: progress.kwargs
        };
    }

    return {
        ok: true,
        state: "nameLookup",
        snapshotId,
        scriptName,
        variableName: progress.variableName
    };
}

const MontyExpoModule: NativeMontyExpoModuleType = {
    version(): string {
        return "0.1.0-web+monty-web";
    },
    isNativeRuntimeLinked(): boolean {
        return false;
    },
    runSync(code: string, options?: RunOptions, montyOptions?: MontyOptions): NativeMontyResult {
        try {
            const runner = new WebMonty(code, normalizeMontyOptions(montyOptions));
            const output = runner.run(normalizeRunOptions(options));
            return {
                ok: true,
                output
            };
        } catch (error) {
            return toNativeRunError(error);
        }
    },
    startSync(code: string, options?: RunOptions, montyOptions?: MontyOptions): NativeMontyProgressResult {
        try {
            const runner = new WebMonty(code, normalizeMontyOptions(montyOptions));
            const progress = runner.start(normalizeStartOptions(options));
            return mapProgressResult(progress, runner.scriptName);
        } catch (error) {
            return toNativeProgressError(error);
        }
    },
    resumeSync(snapshotId: string, options?: unknown): NativeMontyProgressResult {
        const snapshot = snapshotStore.get(snapshotId);
        if (!snapshot) {
            return toNativeProgressError(new Error(`Unknown snapshot id '${snapshotId}'.`));
        }

        snapshotStore.delete(snapshotId);

        try {
            const resumeOptions = normalizeResumeOptions(options);
            const nextProgress =
                snapshot.state instanceof WebMontySnapshot
                    ? snapshot.state.resume(resumeOptions as ResumeOptions)
                    : snapshot.state.resume(resumeOptions as { value?: unknown });
            return mapProgressResult(nextProgress, snapshot.scriptName);
        } catch (error) {
            return toNativeProgressError(error);
        }
    }
};

export default MontyExpoModule;
