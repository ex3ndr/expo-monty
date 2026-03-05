import NativeMontyExpoModule from "./MontyExpoModule";
import type {
    ExceptionInfo,
    Frame,
    JsMontyObject,
    MontyOptions,
    NameLookupLoadOptions,
    NameLookupResumeOptions,
    ResourceLimits,
    ResumeOptions,
    RunMontyAsyncOptions,
    RunOptions,
    SnapshotLoadOptions,
    StartOptions,
    TypingDisplayFormat
} from "./MontyExpo.types";

export type {
    ExceptionInfo,
    ExceptionInput,
    Frame,
    JsMontyObject,
    MontyOptions,
    NameLookupLoadOptions,
    NameLookupResumeOptions,
    ResourceLimits,
    ResumeOptions,
    RunMontyAsyncOptions,
    RunOptions,
    SnapshotLoadOptions,
    StartOptions,
    TypingDisplayFormat
} from "./MontyExpo.types";

export type JsResourceLimits = ResourceLimits;

export class MontyError extends Error {
    protected _typeName: string;
    protected _message: string;

    constructor(typeName: string, message: string) {
        super(message ? `${typeName}: ${message}` : typeName);
        this.name = "MontyError";
        this._typeName = typeName;
        this._message = message;
    }

    get exception(): ExceptionInfo {
        return {
            typeName: this._typeName,
            message: this._message
        };
    }

    display(format: "type-msg" | "msg" = "msg"): string {
        if (format === "msg") {
            return this._message;
        }
        return this._message ? `${this._typeName}: ${this._message}` : this._typeName;
    }
}

export class MontySyntaxError extends MontyError {
    constructor(message: string) {
        super("SyntaxError", message);
        this.name = "MontySyntaxError";
    }
}

export class MontyRuntimeError extends MontyError {
    private _frames: Frame[];

    constructor(typeName: string, message: string, frames: Frame[] = []) {
        super(typeName, message);
        this.name = "MontyRuntimeError";
        this._frames = frames;
    }

    traceback(): Frame[] {
        return this._frames;
    }

    display(format: "traceback" | "type-msg" | "msg" = "traceback"): string {
        if (format === "msg") {
            return this._message;
        }
        if (format === "type-msg") {
            return this._message ? `${this._typeName}: ${this._message}` : this._typeName;
        }
        if (this._frames.length === 0) {
            return this.display("type-msg");
        }
        return `${this.display("type-msg")}\n${JSON.stringify(this._frames, null, 2)}`;
    }
}

export class MontyTypingError extends MontyError {
    constructor(message: string) {
        super("TypeError", message);
        this.name = "MontyTypingError";
    }

    displayDiagnostics(_format: TypingDisplayFormat = "full", _color: boolean = false): string {
        return this._message;
    }
}

export class MontyComplete {
    private _output: JsMontyObject;

    constructor(output: JsMontyObject) {
        this._output = output;
    }

    get output(): JsMontyObject {
        return this._output;
    }

    repr(): string {
        return `MontyComplete(${JSON.stringify(this._output)})`;
    }
}

export class MontySnapshot {
    get scriptName(): string {
        throw new MontyRuntimeError("NotImplementedError", "MontySnapshot is not implemented on mobile yet.");
    }

    get functionName(): string {
        throw new MontyRuntimeError("NotImplementedError", "MontySnapshot is not implemented on mobile yet.");
    }

    get args(): JsMontyObject[] {
        throw new MontyRuntimeError("NotImplementedError", "MontySnapshot is not implemented on mobile yet.");
    }

    get kwargs(): Record<string, JsMontyObject> {
        throw new MontyRuntimeError("NotImplementedError", "MontySnapshot is not implemented on mobile yet.");
    }

    resume(_options: ResumeOptions): MontySnapshot | MontyNameLookup | MontyComplete {
        throw new MontyRuntimeError("NotImplementedError", "MontySnapshot.resume is not implemented on mobile yet.");
    }

    dump(): Uint8Array {
        throw new MontyRuntimeError("NotImplementedError", "MontySnapshot.dump is not implemented on mobile yet.");
    }

    static load(_data: Uint8Array, _options?: SnapshotLoadOptions): MontySnapshot {
        throw new MontyRuntimeError("NotImplementedError", "MontySnapshot.load is not implemented on mobile yet.");
    }

    repr(): string {
        return "MontySnapshot(<not-implemented>)";
    }
}

export class MontyNameLookup {
    get scriptName(): string {
        throw new MontyRuntimeError("NotImplementedError", "MontyNameLookup is not implemented on mobile yet.");
    }

    get variableName(): string {
        throw new MontyRuntimeError("NotImplementedError", "MontyNameLookup is not implemented on mobile yet.");
    }

    resume(_options?: NameLookupResumeOptions): MontySnapshot | MontyNameLookup | MontyComplete {
        throw new MontyRuntimeError("NotImplementedError", "MontyNameLookup.resume is not implemented on mobile yet.");
    }

    dump(): Uint8Array {
        throw new MontyRuntimeError("NotImplementedError", "MontyNameLookup.dump is not implemented on mobile yet.");
    }

    static load(_data: Uint8Array, _options?: NameLookupLoadOptions): MontyNameLookup {
        throw new MontyRuntimeError("NotImplementedError", "MontyNameLookup.load is not implemented on mobile yet.");
    }

    repr(): string {
        return "MontyNameLookup(<not-implemented>)";
    }
}

export class MontyRepl {
    static create(_code: string, _options?: MontyOptions, _startOptions?: StartOptions): MontyRepl {
        throw new MontyRuntimeError("NotImplementedError", "MontyRepl is not implemented on mobile yet.");
    }

    get scriptName(): string {
        throw new MontyRuntimeError("NotImplementedError", "MontyRepl is not implemented on mobile yet.");
    }

    feed(_code: string): JsMontyObject {
        throw new MontyRuntimeError("NotImplementedError", "MontyRepl.feed is not implemented on mobile yet.");
    }

    dump(): Uint8Array {
        throw new MontyRuntimeError("NotImplementedError", "MontyRepl.dump is not implemented on mobile yet.");
    }

    static load(_data: Uint8Array): MontyRepl {
        throw new MontyRuntimeError("NotImplementedError", "MontyRepl.load is not implemented on mobile yet.");
    }

    repr(): string {
        return "MontyRepl(<not-implemented>)";
    }
}

export class Monty {
    private _code: string;
    private _options: MontyOptions | undefined;

    constructor(code: string, options?: MontyOptions) {
        this._code = code;
        this._options = options;
    }

    typeCheck(_prefixCode?: string): void {
        // Type checking will be implemented in the native runtime once Rust mobile
        // linkage is added. The wrapper keeps API compatibility for callers now.
    }

    run(options?: RunOptions): JsMontyObject {
        const result = NativeMontyExpoModule.runSync(this._code, options, this._options);
        if (result.ok) {
            return result.output;
        }
        const typeName = result.error.typeName;
        if (typeName === "SyntaxError") {
            throw new MontySyntaxError(result.error.message);
        }
        throw new MontyRuntimeError(typeName, result.error.message, result.error.traceback ?? []);
    }

    start(_options?: StartOptions): MontySnapshot | MontyNameLookup | MontyComplete {
        throw new MontyRuntimeError(
            "NotImplementedError",
            "Monty.start is not implemented on mobile yet. Use run() for now."
        );
    }

    dump(): Uint8Array {
        throw new MontyRuntimeError("NotImplementedError", "Monty.dump is not implemented on mobile yet.");
    }

    static load(_data: Uint8Array): Monty {
        throw new MontyRuntimeError("NotImplementedError", "Monty.load is not implemented on mobile yet.");
    }

    get scriptName(): string {
        return this._options?.scriptName ?? "main.py";
    }

    get inputs(): string[] {
        return this._options?.inputs ?? [];
    }

    repr(): string {
        return `Monty(scriptName=${this.scriptName})`;
    }
}

export async function runMontyAsync(montyRunner: Monty, options: RunMontyAsyncOptions = {}): Promise<JsMontyObject> {
    return montyRunner.run(options);
}

export function montyExpoVersion(): string {
    return NativeMontyExpoModule.version();
}

export function montyExpoNativeRuntimeLinked(): boolean {
    return NativeMontyExpoModule.isNativeRuntimeLinked();
}
