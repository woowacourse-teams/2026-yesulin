"""A maximum of three synthetic requests for local prompt tuning. No AWS operations."""
import argparse
import hashlib
import json
import re
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from application.applicant_info import ModelFailure, SYSTEM, schema, validate_output
from application.extraction import extract_pdf
from application.profile_info import MAX_CAREERS, normalized
from infrastructure.applicant_models import GeminiModel


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--key-file", type=Path, help="Opt in to real Gemini, synthetic documents only")
    parser.add_argument("--case", action="append", help="Synthetic case ID; maximum three")
    parser.add_argument("--pdf-dir", type=Path, default=ROOT / "output/applicant-fields-quality/pdfs")
    parser.add_argument("--output", type=Path, default=ROOT / "output/profile-ui-prompt-smoke/result.json")
    parser.add_argument("--delay-seconds", type=float, default=10)
    args = parser.parse_args()
    cases = args.case or ["01-labelled", "02-career-limit", "05-ambiguous-role"]
    if not 1 <= len(cases) <= 3 or args.delay_seconds < 0:
        parser.error("Select one to three synthetic cases and a non-negative delay")
    fixture_path = ROOT / "tests/fixtures/applicant-quality.json"
    fixture = json.loads(fixture_path.read_text())
    manifest = json.loads((args.pdf_dir / "synthetic-manifest.json").read_text())
    if (fixture.get("syntheticOnly") is not True or manifest.get("syntheticOnly") is not True
            or hashlib.sha256(fixture_path.read_bytes()).hexdigest() != manifest.get("fixtureSha256")):
        raise ValueError("SYNTHETIC_FIXTURE_MISMATCH")
    selected = [next(case for case in fixture["cases"] if case["id"] == case_id) for case_id in cases]
    # Verify the whole selection before making any external request.
    for case in selected:
        pdf = args.pdf_dir / (case["id"] + ".pdf")
        if hashlib.sha256(pdf.read_bytes()).hexdigest() != manifest["files"].get(case["id"]):
            raise ValueError("SYNTHETIC_PDF_CHANGED")
    model = GeminiModel(args.key_file.read_text().strip(), "gemini-3.5-flash-lite") if args.key_file else None
    report = {"branchContract": "nested-profile", "syntheticOnly": True, "maximumCalls": 3,
              "notCoveredByCurrentUiContract": ["email", "phone", "manualProfileEditing"],
              "promptSha256": hashlib.sha256(SYSTEM.encode()).hexdigest(), "modelCalls": 0, "cases": []}
    for case in selected:
        start = time.perf_counter()
        with tempfile.TemporaryDirectory(prefix="yesulin-prompt-local-") as directory:
            extraction = extract_pdf(args.pdf_dir / (case["id"] + ".pdf"), Path(directory),
                                     extract_images=False, include_regions=False)
        text = "\n\n".join(page["text"] for page in extraction["pages"])
        result = {"id": case["id"], "extractionMs": round((time.perf_counter()-start)*1000, 2),
                  "textCharacters": len(text), "status": "EXTRACTION_ONLY"}
        if model:
            if report["modelCalls"]:
                time.sleep(args.delay_seconds)
            start = time.perf_counter()
            report["modelCalls"] += 1
            try:
                proposal = model(SYSTEM, json.dumps({"roles": fixture["roles"], "documentText": text}, ensure_ascii=False),
                                 schema(fixture["roles"]))
                accepted = validate_output(proposal, text, fixture["roles"])
                profile = accepted.get("profile")
                careers = profile.get("careers", []) if profile else []
                expected_careers = case["expected"]["careers"]
                height_text = profile["height"]["value"] if profile else None
                age_text = profile["age"]["value"] if profile else None
                height_numbers = re.findall(r"\d+(?:\.\d+)?", height_text or "")
                height = float(height_numbers[0]) if height_numbers else None
                if height is not None and re.search(r"(?<!c)m\b|미터", height_text, re.I):
                    height *= 100
                age_numbers = re.findall(r"\d+", age_text or "")
                age = int(age_numbers[0]) if age_numbers else None
                checks = {"name": accepted["applicantName"] == case["expected"]["applicantName"],
                          "role": accepted["roleId"] == case["expected"]["roleId"],
                          "height": height == case["expected"]["heightCm"],
                          "explicitAge": age == case["expected"]["age"],
                          "maxFiveCareers": len(careers) <= MAX_CAREERS,
                          "careerRows": len(careers) == len(expected_careers) and all(
                              normalized(expected) in normalized(actual["evidence"])
                              for expected, actual in zip(expected_careers, careers))}
                result.update(status="COMPLETED", checks=checks, accepted=accepted,
                              modelMs=round((time.perf_counter()-start)*1000, 2))
            except ModelFailure as error:
                result.update(status=error.reason, modelMs=round((time.perf_counter()-start)*1000, 2))
                report["cases"].append(result)
                report["stoppedAfterProviderFailure"] = True
                break  # Never automatically retry or continue after a provider/quota error.
        report["cases"].append(result)
        print(json.dumps({key: value for key, value in result.items() if key != "accepted"}), flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
