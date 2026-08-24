import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evalDir = resolve(root, "evals/grounding");
const reportDir = resolve(evalDir, "reports");
mkdirSync(reportDir, { recursive: true });

const executable = process.env.KAPPA_BIN || "kappa";

function run(args) {
  execFileSync(executable, args, { cwd: root, stdio: "inherit" });
}

run(["lint", resolve(evalDir, "calibrated-prompt.txt")]);
run(["score", resolve(evalDir, "baseline.jsonl"), "--html", resolve(reportDir, "baseline.html")]);
run(["score", resolve(evalDir, "calibrated.jsonl"), "--html", resolve(reportDir, "calibrated.html")]);
run(["drift", resolve(evalDir, "baseline.jsonl"), resolve(evalDir, "calibrated.jsonl"), "--threshold", "0.10"]);
