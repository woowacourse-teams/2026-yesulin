"""Inspect bounded uploads and render locally, without passing service credentials to the engine."""
import os
import re
import signal
import subprocess
import zipfile
import zlib
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree

import olefile

MAX_FILE = 25 * 1024 * 1024
MAX_EXPANDED = 256 * 1024 * 1024
MAX_PACKAGE_ENTRIES = 4096
MAX_PAGES = 50
ZIP_TOOLS = Path(__file__).resolve().parent / "zip-tools"
OFFICE_MAIN = {
    "docx": ("word/document.xml", "wordprocessingml.document"),
    "pptx": ("ppt/presentation.xml", "presentationml.presentation"),
}


class InvalidDocument(ValueError):
    """This submission cannot produce an accepted preview."""


def xml_part(archive, entry):
    if archive.getinfo(entry).file_size > 1024 * 1024:
        raise InvalidDocument("XML_PART_TOO_LARGE")
    return ElementTree.fromstring(archive.read(entry))


def validate_relationships(archive, entry):
    for link in xml_part(archive, entry):
        if link.get("TargetMode", "").lower() != "external":
            continue
        target = link.get("Target", "")
        if (link.get("Type", "").endswith("/hyperlink")
                and urlsplit(target).scheme.lower() in {"https", "http", "mailto", "tel"}):
            continue
        raise InvalidDocument("EXTERNAL_DOCUMENT_RESOURCE")


def validate_office(archive, extension):
    main, document_type = OFFICE_MAIN[extension]
    expected_type = f"application/vnd.openxmlformats-officedocument.{document_type}.main+xml"
    types = xml_part(archive, "[Content_Types].xml")
    if not any(node.get("PartName") == "/" + main and node.get("ContentType") == expected_type for node in types):
        raise InvalidDocument("WRONG_DOCUMENT_TYPE")
    archive.getinfo(main)
    for name in archive.namelist():
        lower = name.lower()
        if lower.endswith("vbaproject.bin") or "/activex/" in lower or "/embeddings/" in lower:
            raise InvalidDocument("ACTIVE_DOCUMENT_PART")
        if lower.endswith(".rels"):
            validate_relationships(archive, name)


def validate_hwpx(archive):
    if archive.getinfo("mimetype").file_size > 128 or archive.read("mimetype").strip() != b"application/hwp+zip":
        raise InvalidDocument("WRONG_DOCUMENT_TYPE")
    for node in xml_part(archive, "Contents/content.hpf").iter():
        href = node.get("href")
        if href:
            target = urlsplit(href)
            if target.scheme or target.netloc or href.startswith(("/", "\\")):
                raise InvalidDocument("EXTERNAL_DOCUMENT_RESOURCE")
    for name in ("Contents/header.xml", "Contents/section0.xml"):
        archive.getinfo(name)


def validate_package(path, extension):
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > MAX_PACKAGE_ENTRIES or sum(part.file_size for part in entries) > MAX_EXPANDED:
            raise InvalidDocument("PACKAGE_TOO_LARGE")
        if any(name.startswith("/") or "\\" in name or ".." in name.split("/") for name in archive.namelist()):
            raise InvalidDocument("INVALID_PACKAGE_PATH")
        if any(part.compress_type not in {zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED} for part in entries):
            raise InvalidDocument("UNSUPPORTED_PACKAGE_COMPRESSION")
        if any(part.flag_bits & 1 for part in entries) or len(set(archive.namelist())) != len(entries):
            raise InvalidDocument("INVALID_PACKAGE")
        if extension == "hwpx":
            return validate_hwpx(archive)
        validate_office(archive, extension)


def bounded_stream_size(data, remaining):
    inflater = zlib.decompressobj(-zlib.MAX_WBITS)
    consumed = 0
    try:
        for offset in range(0, len(data), 32 * 1024):
            chunk = data[offset:offset + 32 * 1024]
            while chunk:
                consumed += len(inflater.decompress(chunk, min(1024 * 1024, remaining - consumed + 1)))
                if consumed > remaining:
                    raise InvalidDocument("PACKAGE_TOO_LARGE")
                chunk = inflater.unconsumed_tail
    except zlib.error:
        return len(data)
    if inflater.eof:
        return consumed
    return len(data)


def validate_hwp(path):
    with olefile.OleFileIO(path) as document:
        header = document.openstream("FileHeader").read(40)
        if len(header) != 40 or header[:32].rstrip(b"\0") != b"HWP Document File":
            raise InvalidDocument("WRONG_DOCUMENT_TYPE")
        flags = int.from_bytes(header[36:40], "little")
        if flags & 6:
            raise InvalidDocument("PROTECTED_DOCUMENT")
        streams = document.listdir(streams=True)
        if len(streams) > MAX_PACKAGE_ENTRIES:
            raise InvalidDocument("PACKAGE_TOO_LARGE")
        remaining = MAX_EXPANDED
        for name in streams:
            size = document.get_size(name)
            if size > MAX_FILE:
                raise InvalidDocument("INVALID_HWP_STREAM")
            if flags & 1 and name[0] in {"DocInfo", "BodyText", "BinData", "Scripts"}:
                size = bounded_stream_size(document.openstream(name).read(), remaining)
            remaining -= size
            if remaining < 0:
                raise InvalidDocument("PACKAGE_TOO_LARGE")


def validate_input(path):
    extension = path.suffix[1:]
    try:
        if extension == "hwp":
            return validate_hwp(path)
        try:
            validate_package(path, extension)
        except (NotImplementedError, zlib.error, EOFError, zipfile.BadZipFile) as error:
            raise InvalidDocument("INVALID_COMPRESSED_CONTENT") from error
    except InvalidDocument:
        raise
    except (LookupError, OSError, ValueError, ElementTree.ParseError) as error:
        raise InvalidDocument("INVALID_DOCUMENT") from error


def run_tool(command, workdir, timeout_seconds, *, capture=False):
    environment = {
        "PATH": "/usr/local/bin:/usr/bin:/bin", "HOME": str(workdir), "TMPDIR": str(workdir),
        "LANG": "C.UTF-8", "LC_ALL": "C.UTF-8", "SAL_USE_VCLPLUGIN": "svp",
        "SAL_DISABLE_OPENCL": "1", "HWP_LANG": "en",
        "http_proxy": "http://127.0.0.1:9", "https_proxy": "http://127.0.0.1:9",
        "all_proxy": "http://127.0.0.1:9",
    }
    if ZIP_TOOLS.is_dir():
        environment["PATH"] = str(ZIP_TOOLS) + ":" + environment["PATH"]
    # Signals must reach both the soffice launcher and the office process.
    output = subprocess.DEVNULL
    if capture:
        output = subprocess.PIPE
    limited_command = ["prlimit", "--core=0", f"--fsize={MAX_EXPANDED}", f"--cpu={timeout_seconds + 1}", "--", *command]
    with subprocess.Popen(limited_command, env=environment, cwd=workdir, start_new_session=True,
                          stdin=subprocess.DEVNULL, stdout=output, stderr=subprocess.DEVNULL) as process:
        try:
            stdout, _ = process.communicate(timeout=timeout_seconds)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.communicate()
            if ZIP_TOOLS.is_dir() and command[0] == "soffice" and not (workdir / ".review-office-ready").is_file():
                raise RuntimeError("ENGINE_PREPARATION_TIMED_OUT") from None
            raise InvalidDocument("RENDER_TIMED_OUT") from None
        if ZIP_TOOLS.is_dir() and process.returncode == os.EX_TEMPFAIL:
            raise RuntimeError("ENGINE_UNAVAILABLE")
        if process.returncode:
            raise InvalidDocument("RENDER_FAILED")
        return stdout


def office_profile(workdir):
    profile = workdir / "profile"
    (profile / "user").mkdir(parents=True)
    (profile / "user" / "registrymodifications.xcu").write_text(
        '<oor:items xmlns:oor="http://openoffice.org/2001/registry">'
        '<item oor:path="/org.openoffice.Office.Common/Security/Scripting">'
        '<prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item>'
        '<item oor:path="/org.openoffice.Inet/Settings"><prop oor:name="ooInetProxyType" oor:op="fuse">'
        '<value>2</value></prop><prop oor:name="ooInetHTTPProxyName" oor:op="fuse"><value>127.0.0.1</value></prop>'
        '<prop oor:name="ooInetHTTPProxyPort" oor:op="fuse"><value>9</value></prop>'
        '<prop oor:name="ooInetHTTPSProxyName" oor:op="fuse"><value>127.0.0.1</value></prop>'
        '<prop oor:name="ooInetHTTPSProxyPort" oor:op="fuse"><value>9</value></prop></item></oor:items>')
    return profile


def render(source, timeout_seconds):
    validate_input(source)
    workdir = source.parent
    output = source.with_suffix(".pdf")
    if source.suffix in {".docx", ".pptx"}:
        command = ["soffice", "-env:UserInstallation=" + office_profile(workdir).as_uri(), "--headless",
                   "--nologo", "--nodefault", "--norestore", "--convert-to", "pdf", "--outdir", str(workdir), str(source)]
        run_tool(command, workdir, timeout_seconds)
    if source.suffix in {".hwp", ".hwpx"}:
        binary, fonts = "/opt/ahwp/ahwp", "/usr/share/fonts/truetype/nanum"
        if ZIP_TOOLS.is_dir():
            binary, fonts = str(ZIP_TOOLS / "ahwp"), str(ZIP_TOOLS / "fonts")
        command = [binary, "convert", str(source), "--font-dir", fonts, "-o", str(output)]
        run_tool(command, workdir, timeout_seconds)
    if not output.is_file() or not 1 <= output.stat().st_size <= MAX_FILE:
        raise InvalidDocument("INVALID_PREVIEW_SIZE")
    # pdfinfo can include user-provided metadata. Read only the Pages line, never log stdout.
    info = run_tool(["pdfinfo", str(output)], workdir, 6, capture=True)
    count = re.search(rb"^Pages:\s+(\d+)\s*$", info, flags=re.MULTILINE)
    if not count or not 1 <= int(count.group(1)) <= MAX_PAGES:
        raise InvalidDocument("INVALID_PAGE_COUNT")
    return output
