import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const backendDirectory = fileURLToPath(new URL("../backend/", import.meta.url));
const isWindows = process.platform === "win32";
const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "./gradlew";
const args = isWindows
  ? ["/d", "/s", "/c", "gradlew.bat checkstyleMain checkstyleTest"]
  : ["checkstyleMain", "checkstyleTest"];
const result = spawnSync(command, args, {
  cwd: backendDirectory,
  stdio: "inherit",
});

if (result.error) {
  console.error(`Checkstyle 실행에 실패했습니다: ${result.error.message}`);
}

process.exitCode = result.status ?? 1;
