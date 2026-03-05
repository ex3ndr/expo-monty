# monty-expo

Nitro Modules implementation for iOS and Android.

This package provides a native Nitro module bridge and a TypeScript API aligned with `monty-web`.
It is wired to a Rust FFI crate that executes Monty on-device.

## Status

Native module wiring is implemented for both platforms, with:

- `runSync(...)`,
- `startSync(...)` / `resumeSync(...)` for resumable execution,
- `version()`,
- `isNativeRuntimeLinked()`.

Web fallback now delegates to `monty-web` through the same `runSync/startSync/resumeSync` bridge contract.

## External function example

```ts
import { Monty } from "monty-expo";

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
yarn workspace monty-expo build:rust
yarn workspace monty-expo codegen
yarn workspace monty-expo build
```

Platform-specific rust builds:

```bash
yarn workspace monty-expo build:rust:ios
yarn workspace monty-expo build:rust:android
```
