import type { Applicant, PerformanceRef, RoundNumber } from "./types";
import { ageText, ROUND_LABELS } from "./labels";
import { ROUND_NUMBERS } from "./types";
import { applicantEducationText } from "./education-text";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);

const PRINT_COLOR_TOKENS = [
  "--ink",
  "--ink-60",
  "--ink-20",
  "--line",
  "--line-soft",
  "--pass",
  "--fail",
  "--absent",
  "--etc",
  "--pending",
] as const;

const PRINT_STYLE = `
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:0}
body{font-family:'Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic',Arial,sans-serif;color:var(--ink);background:#eef1f5;padding:24px}
.pp-page{width:210mm;min-height:297mm;margin:0 auto 24px;padding:14mm 12mm;background:#fff}
.pp-head{display:flex;gap:22px;padding-bottom:16px;border-bottom:2px solid var(--ink);margin-bottom:16px}
.pp-photo{width:180px;height:240px;border-radius:6px;overflow:hidden;background:var(--line-soft);flex-shrink:0}
.pp-photo img{width:100%;height:100%;object-fit:cover;object-position:center 18%}
.pp-photo-empty{display:grid;width:100%;height:100%;place-items:center;color:var(--ink-20);font-size:12px}
.pp-name{font-size:24px;font-weight:700;letter-spacing:-.02em}
.pp-role{font-size:14px;color:var(--ink-60);margin:5px 0 16px}
.pp-facts{display:grid;gap:10px;font-size:13px}
.pp-facts div{display:grid;grid-template-columns:74px minmax(0,1fr);gap:10px}
.pp-facts dt{color:var(--ink-20);font-weight:600}
.pp-facts dd{min-width:0;overflow-wrap:anywhere}
.pp-sec{margin-bottom:16px}
.pp-sec h3{font-size:12px;font-weight:700;color:var(--ink-20);letter-spacing:.06em;text-transform:uppercase;
  margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--line)}
.pp-empty{font-size:12px;color:var(--ink-20)}
.pp-essay{font-size:13px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}
.pp-tbl{width:100%;border-collapse:collapse;font-size:12px}
.pp-tbl th{text-align:left;color:var(--ink-20);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line);background:var(--line-soft)}
.pp-tbl td{padding:8px;border-bottom:1px solid var(--line-soft);vertical-align:top}
.pp-tbl th:first-child,.pp-tbl td:first-child{width:72px;font-variant-numeric:tabular-nums}
.pp-contact{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:12px}
.pp-contact div{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px}
.pp-contact dt{color:var(--ink-20);font-weight:600}
.pp-contact dd{min-width:0;overflow-wrap:anywhere}
.pp-text-sec{break-inside:avoid;page-break-inside:avoid}
.pp-memo-sec{break-inside:avoid;page-break-inside:avoid}
.pp-note-item{font-size:12px;line-height:1.7;padding:8px 0;border-bottom:1px dashed var(--line)}
.pp-note-item:last-child{border-bottom:none}
.pp-note-item b{margin-right:8px}
.pp-writelines{height:150px;background-image:repeating-linear-gradient(
  to bottom,transparent,transparent 23px,var(--ink-20) 23px,var(--ink-20) 24px);background-position:0 8px}
.pp-foot{font-size:12px;color:var(--ink-20);text-align:right;margin-top:16px}
@media print{body{padding:0;background:#fff}.pp-page{width:auto;min-height:297mm;margin:0;padding:14mm 12mm;break-after:page;page-break-after:always}.pp-page:last-child{break-after:auto;page-break-after:auto}}
@media(max-width:640px){body{padding:0}.pp-page{width:100%;min-height:0;margin:0;padding:20px}.pp-head{gap:14px}.pp-photo{width:120px;height:160px}.pp-name{font-size:20px}.pp-contact{grid-template-columns:1fr}}
`;

function printColorVariables() {
  const styles = getComputedStyle(document.documentElement);
  const declarations = PRINT_COLOR_TOKENS.map((token) => `${token}:${styles.getPropertyValue(token).trim()}`);
  return `:root{${declarations.join(";")}}`;
}

function reviewRows(applicant: Applicant) {
  return ROUND_NUMBERS.map((round) => ({ round, review: applicant.reviewHistory[round] })).filter(
    (entry): entry is { round: RoundNumber; review: NonNullable<(typeof entry)["review"]> } =>
      entry.review !== null,
  );
}

function printableCard(applicant: Applicant, performance: PerformanceRef) {
  const notes = reviewRows(applicant).filter((entry) => entry.review.note.trim());
  const representativePhoto = applicant.photos[0];
  const photo = representativePhoto
    ? `<img src="${escapeHtml(representativePhoto.url)}" alt="">`
    : '<span class="pp-photo-empty">사진 없음</span>';

  return `<section class="pp-page">
  <header class="pp-head">
    <div class="pp-photo">${photo}</div>
    <div>
      <div class="pp-name">${escapeHtml(applicant.name)}</div>
      <div class="pp-role">${escapeHtml(applicant.roleName)} 지원</div>
      <dl class="pp-facts">
        <div><dt>키·나이</dt><dd>${printMeasurement(applicant.height, "cm")} · ${ageText(applicant.age)}</dd></div>
        <div><dt>학교/학과</dt><dd>${escapeHtml(applicantEducationText(applicant))}</dd></div>
        <div><dt>SNS</dt><dd>${applicant.links.length > 0 ? applicant.links.map(escapeHtml).join("<br>") : "미등록"}</dd></div>
      </dl>
    </div>
  </header>
  <section class="pp-sec"><h3>경력 ${applicant.career.length}건</h3>
    ${
      applicant.career.length > 0
        ? `<table class="pp-tbl"><thead><tr><th>연도</th><th>작품명</th><th>역할</th></tr></thead><tbody>${applicant.career
            .map((entry) => `<tr><td>${entry.year}</td><td>${escapeHtml(entry.title)}</td><td>${escapeHtml(entry.part)}</td></tr>`)
            .join("")}</tbody></table>`
        : '<p class="pp-empty">등록된 경력이 없습니다.</p>'
    }</section>
  <section class="pp-sec"><h3>연락처</h3><dl class="pp-contact"><div><dt>전화</dt><dd>${escapeHtml(applicant.phone)}</dd></div><div><dt>이메일</dt><dd>${escapeHtml(applicant.email)}</dd></div></dl></section>
  <section class="pp-sec pp-text-sec"><h3>자기소개서</h3><p class="pp-essay">${escapeHtml(applicant.coverLetter)}</p></section>
  ${applicant.questions.map((question) => `<section class="pp-sec pp-text-sec"><h3>${escapeHtml(question.question)}</h3><p class="pp-essay">${escapeHtml(question.answer)}</p></section>`).join("")}
  <section class="pp-sec pp-memo-sec"><h3>메모</h3>
    ${notes.map((entry) => `<div class="pp-note-item"><b>${ROUND_LABELS[entry.round]} 메모</b> ${escapeHtml(entry.review.note)}</div>`).join("")}
    <div class="pp-writelines" aria-hidden="true"></div>
  </section>
  <footer class="pp-foot">예술in · ${escapeHtml(performance.title)} · 출력일 ${new Date().toLocaleDateString("ko-KR")}</footer>
</section>`;
}

function printMeasurement(value: number | null, unit: string) {
  return value === null ? "미수집" : `${value}${unit}`;
}

/**
 * 브라우저 인쇄 대화상자를 그대로 쓴다(PDF 저장·실제 인쇄 모두 여기서 처리).
 * 별도 창에 A4 전용 문서를 만들어 화면 스타일이 인쇄에 새지 않게 한다.
 */
export function openPrintWindow(applicants: readonly Applicant[], performance: PerformanceRef, documentTitle?: string) {
  if (applicants.length === 0) return false;

  const title = documentTitle ?? (
    applicants.length === 1 ? `${applicants[0]?.name ?? ""} 프로필` : `배우 ${applicants.length}명`
  );
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return false;

  win.document.open();
  win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>${printColorVariables()}${PRINT_STYLE}</style></head><body>${applicants.map((applicant) => printableCard(applicant, performance)).join("")}</body></html>`);
  win.document.close();
  win.addEventListener("load", () => {
    win.focus();
    win.print();
  });

  return true;
}
