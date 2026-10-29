"""Cross-build a Python 3.12 / Linux ARM64 zip, including pinned native wheels."""
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "build/package"
def main():
    shutil.rmtree(PACKAGE, ignore_errors=True)
    PACKAGE.mkdir(parents=True)
    subprocess.run([sys.executable, "-m", "pip", "install", "--disable-pip-version-check",
                    "--platform", "manylinux_2_28_aarch64", "--platform", "manylinux2014_aarch64",
                    "--implementation", "cp", "--python-version", "3.12", "--only-binary=:all:",
                    "--target", str(PACKAGE), "--report", str(ROOT / "build/dependencies.json"),
                    "-r", str(ROOT / "requirements-lock-linux-arm64.txt")], check=True)
    shutil.copytree(ROOT / "src", PACKAGE, dirs_exist_ok=True)
    for directory in list(PACKAGE.rglob("__pycache__")):
        shutil.rmtree(directory)
    zip_path = ROOT / "build/yesulin-pdf-extractor-arm64.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(PACKAGE.rglob("*")):
            if path.is_file():
                info = zipfile.ZipInfo(str(path.relative_to(PACKAGE)))
                info.external_attr = 0o100644 << 16
                bundle.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED)
    with zip_path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    manifest = {"runtime": "python3.12", "architecture": "arm64", "sha256": digest,
                "zipBytes": zip_path.stat().st_size, "uncompressedBytes": sum(
                    path.stat().st_size for path in PACKAGE.rglob("*") if path.is_file())}
    (ROOT / "build/package-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
