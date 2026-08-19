import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDirectory = path.join(repositoryRoot, "backend");
const isWindows = process.platform === "win32";
const gradleWrapper = path.join(backendDirectory, isWindows ? "gradlew.bat" : "gradlew");
const result = spawnSync(
    gradleWrapper,
    ["-p", backendDirectory, "checkstyleMain", "checkstyleTest"],
    {
        cwd: repositoryRoot,
        stdio: "inherit",
        shell: isWindows,
    },
);

if (result.error) {
    console.error(`Failed to start Gradle Wrapper: ${result.error.message}`);
    process.exit(1);
}

process.exit(result.status ?? 1);
