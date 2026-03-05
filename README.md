# monty-js

Yarn workspace monorepo for Monty JS packages:

- `expo-monty`: Nitro Modules package for iOS/Android native bridge with embedded web/WASM runtime.

## Quick Start

```bash
yarn install
yarn build:expo
yarn build:web
```

`yarn build:web` refreshes the embedded web runtime from upstream `pydantic/monty`.
