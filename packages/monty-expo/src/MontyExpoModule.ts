import { NitroModules } from "react-native-nitro-modules";
import type { MontyExpo as MontyExpoSpec } from "./specs/monty-expo.nitro";
import type { MontyOptions, NativeMontyResult, RunOptions } from "./MontyExpo.types";

export type NativeMontyExpoModuleType = {
    version(): string;
    isNativeRuntimeLinked(): boolean;
    runSync(code: string, options?: RunOptions, montyOptions?: MontyOptions): NativeMontyResult;
};

const FALLBACK_ERROR: NativeMontyResult = {
    ok: false,
    error: {
        typeName: "RuntimeError",
        message: "Monty Nitro runtime is not linked."
    }
};

function safeStringify(value: unknown): string {
    try {
        return JSON.stringify(value ?? null);
    } catch (_error) {
        return "null";
    }
}

function parseNativeResult(raw: string): NativeMontyResult {
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "ok" in parsed) {
            return parsed as NativeMontyResult;
        }
        return FALLBACK_ERROR;
    } catch (_error) {
        return FALLBACK_ERROR;
    }
}

const NativeMontyExpoNitro = NitroModules.createHybridObject<MontyExpoSpec>("MontyExpo");

const NativeMontyExpoModule: NativeMontyExpoModuleType = {
    version(): string {
        return NativeMontyExpoNitro.version();
    },
    isNativeRuntimeLinked(): boolean {
        return NativeMontyExpoNitro.isNativeRuntimeLinked();
    },
    runSync(code: string, options?: RunOptions, montyOptions?: MontyOptions): NativeMontyResult {
        try {
            const raw = NativeMontyExpoNitro.runSync(code, safeStringify(options), safeStringify(montyOptions));
            return parseNativeResult(raw);
        } catch (error) {
            return {
                ok: false,
                error: {
                    typeName: "RuntimeError",
                    message: error instanceof Error ? error.message : "Nitro module call failed."
                }
            };
        }
    }
};

export default NativeMontyExpoModule;
