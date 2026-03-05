import { execSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, "..");
const distDir = join(packageDir, "dist");
const tempRoot = mkdtempSync(join(tmpdir(), "monty-web-build-"));

const upstreamRepo = process.env.MONTY_UPSTREAM_REPO ?? "https://github.com/pydantic/monty.git";
const upstreamRef = process.env.MONTY_UPSTREAM_REF ?? "main";
const pyo3Python = process.env.PYO3_PYTHON ?? "python3";
const rustTarget = "wasm32-wasip1-threads";

const upstreamDir = join(tempRoot, "monty");
const upstreamMontyJsDir = join(upstreamDir, "crates", "monty-js");

function run(command, options = {}) {
  // Show each command for visibility while the build runs for a few minutes.
  process.stdout.write(`\n$ ${command}\n`);
  execSync(command, { stdio: "inherit", ...options });
}

try {
  run(`git clone --depth 1 --branch ${upstreamRef} ${upstreamRepo} ${upstreamDir}`);

  const upstreamCommit = execSync("git rev-parse HEAD", { cwd: upstreamDir }).toString().trim();

  run(`rustup target add ${rustTarget}`);
  run("npm ci", { cwd: upstreamMontyJsDir });
  run(`npx napi build --platform --release --esm --target ${rustTarget}`, {
    cwd: upstreamMontyJsDir,
    env: {
      ...process.env,
      PYO3_PYTHON: pyo3Python
    }
  });
  run("npm run build:ts", { cwd: upstreamMontyJsDir });

  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  const copyFiles = [
    "index.d.ts",
    "wrapper.js",
    "wrapper.d.ts",
    "monty.wasi-browser.js",
    "wasi-worker-browser.mjs",
    "monty.wasm32-wasi.wasm"
  ];

  for (const file of copyFiles) {
    cpSync(join(upstreamMontyJsDir, file), join(distDir, file));
  }

  const browserBindingPath = join(distDir, "monty.wasi-browser.js");
  const browserBindingContents = readFileSync(browserBindingPath, "utf8");
  const patchedBrowserBindingContents = browserBindingContents.replace(
    /new URL\('@pydantic\/monty-wasm32-wasi\/wasi-worker-browser\.mjs', import\.meta\.url\)/g,
    "new URL('./wasi-worker-browser.mjs', import.meta.url)"
  );
  writeFileSync(browserBindingPath, patchedBrowserBindingContents);

  writeFileSync(
    join(distDir, "index.js"),
    "export * from \"./monty.wasi-browser.js\";\nexport { default } from \"./monty.wasi-browser.js\";\n"
  );

  writeFileSync(
    join(distDir, "upstream.json"),
    `${JSON.stringify(
      {
        repository: upstreamRepo,
        ref: upstreamRef,
        commit: upstreamCommit
      },
      null,
      2
    )}\n`
  );

  process.stdout.write(`\nBuilt monty-web from ${upstreamRepo}@${upstreamCommit}\n`);
  process.stdout.write(`Output: ${distDir}\n`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
