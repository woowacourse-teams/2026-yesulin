"""Commands for the development Lambda ZIP; only trusted layer bytes are executable."""
import hashlib
import os
import resource
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path

TASK = Path(__file__).resolve().parent
ENGINE = Path("/tmp/yslo")
RUNTIME_SHA256 = "124c0cea997eba156a3ddf4ab4fc9701cb544691e3a50c3dda5343ffbe63b49e"


def unpack_office(directory):
    archive = directory / "runtime.tar.xz"
    with archive.open("wb") as target:
        for part in range(1, 5):
            with Path(f"/opt/runtime.part-{part:02}").open("rb") as source:
                shutil.copyfileobj(source, target)
    with archive.open("rb") as source:
        if hashlib.file_digest(source, "sha256").hexdigest() != RUNTIME_SHA256:
            raise OSError("Unexpected LibreOffice layer version")
    with tarfile.open(archive, "r|xz") as bundle:
        bundle.extractall(directory, filter="data")
    (directory / "yslo").rename(ENGINE)


def office(arguments):
    # The layer contains absolute LibreOffice paths. Never execute files left
    # by an earlier uploaded document in the same warm environment.
    if ENGINE.is_symlink():
        ENGINE.unlink()
    if ENGINE.exists():
        shutil.rmtree(ENGINE)
    with tempfile.TemporaryDirectory(prefix="review-engine-", dir=Path.cwd()) as temporary:
        unpack_office(Path(temporary))
    extensions = Path.cwd() / "empty-extensions"
    extensions.mkdir()
    (Path.cwd() / ".review-office-ready").touch()
    launcher = str(TASK / "office-launcher")
    os.execv(launcher, [launcher, "-env:BUNDLED_EXTENSIONS=" + extensions.as_uri(), *arguments])


def limit(arguments):
    core, file_size, cpu, delimiter, *command = arguments
    if core != "--core=0" or delimiter != "--" or not command:
        raise ValueError("Unexpected renderer limits")
    for name, option, identifier in (("fsize", file_size, resource.RLIMIT_FSIZE), ("cpu", cpu, resource.RLIMIT_CPU)):
        prefix = "--" + name + "="
        if not option.startswith(prefix):
            raise ValueError("Unexpected renderer limit")
        value = int(option[len(prefix):])
        resource.setrlimit(identifier, (value, value))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    os.execvp(command[0], command)


def pages(arguments):
    sys.path.insert(0, str(TASK))
    import pypdfium2_raw as pdfium

    pdfium.FPDF_InitLibrary()
    document = pdfium.FPDF_LoadDocument(os.fsencode(arguments[0]), None)
    if not document:
        raise ValueError("Invalid PDF")
    try:
        print(f"Pages: {pdfium.FPDF_GetPageCount(document)}")
    finally:
        pdfium.FPDF_CloseDocument(document)
        pdfium.FPDF_DestroyLibrary()


if __name__ == "__main__":
    try:
        {"prlimit": limit, "soffice": office, "pdfinfo": pages}[sys.argv[1]](sys.argv[2:])
    except (OSError, tarfile.TarError, EOFError):
        sys.exit(os.EX_TEMPFAIL)
