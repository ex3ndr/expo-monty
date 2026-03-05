# monty-expo

Nitro Modules implementation for iOS and Android.

This package provides a native Nitro module bridge and a TypeScript API aligned with `monty-web`.
It is wired to a Rust FFI crate that executes Monty on-device.

## Status

Native module wiring is implemented for both platforms, with:

- synchronous `runSync(...)` entrypoint,
- `version()`,
- `isNativeRuntimeLinked()`.

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
