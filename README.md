# expo-monty

Nitro Modules implementation for iOS, Android, and web.

This package provides a native Nitro module bridge and a TypeScript API for all platforms.
It is wired to a Rust FFI crate that executes Monty on-device.

## Status

Native module wiring is implemented for both platforms, with:

- `runSync(...)`,
- `startSync(...)` / `resumeSync(...)` for resumable execution,
- `version()`,
- `isNativeRuntimeLinked()`.

Web fallback uses an embedded WASM runtime through the same `runSync/startSync/resumeSync` bridge contract.

## External function example

```ts
import { loadMonty, Monty } from "expo-monty";

await loadMonty();

const monty = new Monty(
  "def run(value):\n    return multiply_and_add(value, 10)\n\nrun(input_value)",
  {
    scriptName: "external-function.py",
    inputs: ["input_value"],
  },
);

const output = monty.run({
  inputs: { input_value: 2 },
  externalFunctions: {
    multiply_and_add: (value, factor) => Number(value) * Number(factor) + 7,
  },
});

// output === 27
```

## Build

```bash
yarn build:rust
yarn build:web-runtime
yarn codegen
yarn build
```

`yarn build:web-runtime` uses the pinned upstream ref from `package.json` (`config.montyUpstreamRef`, currently `v0.0.7`).
Override it for one-off builds:

```bash
MONTY_UPSTREAM_REF=<tag-or-commit> yarn build:web-runtime
```

Platform-specific rust builds:

```bash
yarn build:rust:ios
yarn build:rust:android
```
