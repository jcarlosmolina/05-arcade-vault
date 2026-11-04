// PostToolUse hook: run Prettier (any supported file) and ESLint --fix (JS/TS)
// on the file Claude just wrote or edited. Exit 2 reports lint errors to Claude.
import { spawnSync } from "node:child_process";
import path from "node:path";

const LINTABLE = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

const filePath = JSON.parse(raw || "{}").tool_input?.file_path;
if (!filePath) process.exit(0);

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
const absFile = path.resolve(filePath);
const rel = path.relative(projectDir, absFile);
if (rel.startsWith("..") || path.isAbsolute(rel)) process.exit(0);
if (/(^|[\\/])(node_modules|\.next)([\\/]|$)/.test(rel)) process.exit(0);

const run = (args) =>
  spawnSync("npx", ["--no-install", ...args], {
    cwd: projectDir,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

const quoted = `"${absFile}"`;

const pretty = run(["prettier", "--write", "--ignore-unknown", quoted]);
if (pretty.status !== 0) {
  process.stderr.write(`Prettier failed on ${rel}:\n${pretty.stderr || pretty.stdout}`);
  process.exit(2);
}

if (LINTABLE.has(path.extname(absFile).toLowerCase())) {
  const lint = run(["eslint", "--fix", "--no-warn-ignored", quoted]);
  if (lint.status !== 0) {
    process.stderr.write(`ESLint errors in ${rel}:\n${lint.stdout}${lint.stderr}`);
    process.exit(2);
  }
}

process.exit(0);
