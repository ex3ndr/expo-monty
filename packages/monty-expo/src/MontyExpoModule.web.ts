import type { MontyOptions, NativeMontyResult, RunOptions } from "./MontyExpo.types";
import type { NativeMontyExpoModuleType } from "./MontyExpoModule";

const NOT_IMPLEMENTED: NativeMontyResult = {
    ok: false,
    error: {
        typeName: "NotImplementedError",
        message: "Monty native runtime is not linked in web fallback."
    }
};

const MontyExpoModule: NativeMontyExpoModuleType = {
    version(): string {
        return "0.1.0-web";
    },
    isNativeRuntimeLinked(): boolean {
        return false;
    },
    runSync(_code: string, _options?: RunOptions, _montyOptions?: MontyOptions): NativeMontyResult {
        return NOT_IMPLEMENTED;
    }
};

export default MontyExpoModule;
