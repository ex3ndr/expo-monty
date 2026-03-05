import { requireNativeModule } from "expo-modules-core";
import type { MontyOptions, NativeMontyResult, RunOptions } from "./MontyExpo.types";

export type NativeMontyExpoModuleType = {
    version(): string;
    isNativeRuntimeLinked(): boolean;
    runSync(code: string, options?: RunOptions, montyOptions?: MontyOptions): NativeMontyResult;
};

const NativeMontyExpoModule = requireNativeModule<NativeMontyExpoModuleType>("MontyExpo");

export default NativeMontyExpoModule;
