"""Package the SQS service handler for an existing four-part development engine layer."""
import argparse
import hashlib
import stat
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ZIP_DIR = Path(__file__).resolve().parent
SERVICE_DIR = ZIP_DIR.parent
ENGINE_SHA = "e505eb41e7ac12caf746b3927fa9be2f4781a5a4898bb7428d3ff46d941a4525"
WHEELS = {
    "olefile-0.47-py2.py3-none-any.whl": "543c7da2a7adadf21214938bb79c83ea12b473a4b6ee4ad4bf854e7715e13d1f",
    "pypdfium2-5.14.0-py3-none-manylinux_2_17_x86_64.manylinux2014_x86_64.whl":
        "11f281613fa22313d9c7ab89947665e84eccf8ebe40e1198a84a88352305648d",
}
LAYER_UNPACKED_BYTES = 191891648


def verify(path, expected):
    with path.open("rb") as file:
        if hashlib.file_digest(file, "sha256").hexdigest() != expected:
            raise ValueError(f"Unexpected digest: {path.name}")


def write(target, name, data, mode=0o644):
    info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
    info.create_system = 3
    info.external_attr = (stat.S_IFREG | mode) << 16
    target.writestr(info, data, compress_type=ZIP_DEFLATED, compresslevel=6)


def engine(target, path):
    verify(path, ENGINE_SHA)
    with ZipFile(path) as bundle:
        write(target, "office-launcher", bundle.read("launcher"), mode=0o755)
        write(target, "zip-tools/ahwp", bundle.read("hangul_engine/ahwp"), mode=0o755)
        for name in bundle.namelist():
            relative = name.removeprefix("hangul_engine/")
            if relative.startswith(("fonts/", "licenses/", "LICENSE", "NOTICE")) and name.startswith("hangul_engine/"):
                write(target, "zip-tools/" + relative, bundle.read(name))


def dependencies(target, directory):
    for name, digest in WHEELS.items():
        path = directory / name
        verify(path, digest)
        with ZipFile(path) as wheel:
            for member in wheel.namelist():
                if member.startswith(("olefile/", "pypdfium2_raw/")) or "licens" in member.lower():
                    write(target, member, wheel.read(member))


def write_package(path, wheels, output):
    with ZipFile(output, "w") as target:
        for name in ("worker.py", "renderer.py", "signed_storage.py"):
            write(target, name, (SERVICE_DIR / name).read_bytes())
        write(target, "zip_runtime.py", (ZIP_DIR / "runtime.py").read_bytes())
        for command in ("soffice", "pdfinfo", "prlimit"):
            script = f'#!/bin/sh\nexec /var/lang/bin/python3.12 -I /var/task/zip_runtime.py {command} "$@"\n'
            write(target, "zip-tools/" + command, script.encode(), mode=0o755)
        dependencies(target, wheels)
        engine(target, path)
        size = sum(part.file_size for part in target.infolist()) + LAYER_UNPACKED_BYTES
        if size > 250 * 1024 * 1024:
            raise ValueError("Exceeds Lambda code and layers limit")
    return size


def build(path, wheels, output):
    with tempfile.TemporaryDirectory(dir=output.parent) as temporary:
        candidate = Path(temporary) / "review-documents.zip"
        size = write_package(path, wheels, candidate)
        candidate.replace(output)
    return size


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("verified_engine_zip", type=Path)
    parser.add_argument("wheel_directory", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print("Code and layers, uncompressed bytes:", build(args.verified_engine_zip, args.wheel_directory, args.output))
