# monty-web

Browser/WASM package for Monty, built from upstream `pydantic/monty` without forking.

## Build

```bash
yarn workspace monty-web build
```

Environment overrides:

- `MONTY_UPSTREAM_REPO` (default: `https://github.com/pydantic/monty.git`)
- `MONTY_UPSTREAM_REF` (default: `main`)
- `PYO3_PYTHON` (default: `python3`)

Build output is written to `dist/`.
