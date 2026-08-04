import type { Applicant, PerformanceRef, RoundNumber } from "./types";
import { GENDER_LABELS, ROUND_LABELS, statusText } from "./labels";
import { ROUND_NUMBERS } from "./types";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);

const PRINT_STYLE = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Pretendard Variable',Pretendard,sans-serif;color:#16151A;padding:22px}
.pp-page{max-width:760px;margin:0 auto;padding-bottom:26px}
.pp-page+.pp-page{page-break-before:always;padding-top:8px}
.pp-head{display:flex;gap:20px;padding-bottom:16px;border-bottom:2px solid #16151A;margin-bottom:16px}
.pp-photo{width:130px;height:173px;border-radius:6px;overflow:hidden;background:#EFEDF2;flex-shrink:0}
.pp-photo img{width:100%;height:100%;object-fit:cover;object-position:center 18%}
.pp-name{font-size:22px;font-weight:700;letter-spacing:-.02em;display:flex;align-items:center;gap:9px}
.pp-role{font-size:13px;color:#5C5A63;margin:3px 0 12px}
.pp-badge{font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:99px;border:1px solid currentColor}
.s-PASS{color:#1F7A5C}.s-FAIL{color:#9A3131}.s-ABSENT{color:#5A5A62}.s-ETC{color:#4B4098}.s-PENDING{color:#6B6975}
.pp-facts{display:grid;grid-template-columns:1fr 1fr;gap:6px 22px;font-size:12.5px}
.pp-facts div{display:flex;gap:8px}
.pp-facts dt{color:#8C8A93;width:64px;flex-shrink:0}
.pp-sec{margin-bottom:16px}
.pp-sec h3{font-size:11.5px;font-weight:700;color:#8C8A93;letter-spacing:.06em;text-transform:uppercase;
  margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #E4E2E8}
.pp-sec ul{list-style:none;font-size:13px;line-height:1.9}
.pp-sec ul b{font-variant-numeric:tabular-nums;margin-right:8px;color:#5C5A63}
.pp-empty{font-size:12.5px;color:#8C8A93}
.pp-essay{font-size:12.5px;line-height:1.75}
.pp-tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.pp-tbl th{text-align:left;color:#8C8A93;font-weight:600;padding:5px 8px;border-bottom:1px solid #E4E2E8}
.pp-tbl td{padding:6px 8px;border-bottom:1px solid #EFEDF2}
.pp-memo-sec{break-inside:avoid;page-break-inside:avoid}
.pp-note-item{font-size:12.5px;line-height:1.7;padding:7px 0;border-bottom:1px dashed #E4E2E8}
.pp-note-item:last-child{border-bottom:none}
.pp-note-item b{margin-right:8px}
.pp-writelines{height:150px;background-image:repeating-linear-gradient(
  to bottom,transparent,transparent 23px,#C8C6CE 23px,#C8C6CE 24px);background-position:0 8px}
.pp-foot{font-size:10.5px;color:#8C8A93;text-align:right;margin-top:14px}
@media print{body{padding:0}.pp-page{max-width:none;padding:14mm 12mm}}
`;

function reviewRows(applicant: Applicant) {
  return ROUND_NUMBERS.map((round) => ({ round, review: applicant.reviewHistory[round] })).filter(
    (entry): entry is { round: RoundNumber; review: NonNullable<(typeof entry)["review"]> } =>
      entry.review !== null,
  );
}

function printableCard(applicant: Applicant, performance: PerformanceRef) {
  const rows = reviewRows(applicant);
  const latest = rows.at(-1);
  const notes = rows.filter((entry) => entry.review.note.trim());

  return `<section class="pp-page">
  <header class="pp-head">
    <div class="pp-photo"><img src="${escapeHtml(applicant.photos[0]?.url ?? "")}" alt=""></div>
    <div>
      <div class="pp-name">${escapeHtml(applicant.name)}
        ${latest ? `<span class="pp-badge s-${latest.review.status}">${escapeHtml(statusText(latest.review.status, latest.review.memo))}</span>` : ""}</div>
      <div class="pp-role">${escapeHtml(applicant.roleName)} 지원</div>
      <dl class="pp-facts">
        <div><dt>성별·나이</dt><dd>${GENDER_LABELS[applicant.gender]} · 만 ${applicant.age}세</dd></div>
        <div><dt>신장/체중</dt><dd>${applicant.height}cm / ${applicant.weight}kg</dd></div>
        <div><dt>생년월</dt><dd>${escapeHtml(applicant.birth)}</dd></div>
        <div><dt>학교</dt><dd>${escapeHtml(applicant.school)}</dd></div>
        <div><dt>연락처</dt><dd>${escapeHtml(applicant.phone)}</dd></div>
        <div><dt>이메일</dt><dd>${escapeHtml(applicant.email)}</dd></div>
        <div><dt>접수</dt><dd>${escapeHtml(applicant.submittedAt)}</dd></div>
        <div><dt>제출 자료</dt><dd>사진 ${applicant.photos.length}장${applicant.videoUrl ? " · 영상 링크 있음" : ""}</dd></div>
      </dl>
    </div>
  </header>
  <section class="pp-sec"><h3>자기소개서</h3><p class="pp-essay">${escapeHtml(applicant.coverLetter)}</p></section>
  <section class="pp-sec"><h3>지원 동기</h3><p class="pp-essay">${escapeHtml(applicant.motivation)}</p></section>
  <section class="pp-sec"><h3>경력 ${applicant.career.length}건</h3>
    ${
      applicant.career.length > 0
        ? `<ul>${applicant.career.map((entry) => `<li><b>${entry.year}</b> ${escapeHtml(entry.title)} — ${escapeHtml(entry.part)}</li>`).join("")}</ul>`
        : '<p class="pp-empty">등록된 경력이 없습니다.</p>'
    }</section>
  <section class="pp-sec"><h3>차수별 심사 기록</h3>
    ${
      rows.length > 0
        ? `<table class="pp-tbl"><thead><tr><th>차수</th><th>결과</th></tr></thead><tbody>${rows
            .map(
              (entry) =>
                `<tr><td>${ROUND_LABELS[entry.round]}</td><td>${escapeHtml(statusText(entry.review.status, entry.review.memo))}</td></tr>`,
            )
            .join("")}</tbody></table>`
        : '<p class="pp-empty">아직 심사 기록이 없습니다.</p>'
    }</section>
  <section class="pp-sec pp-memo-sec"><h3>메모</h3>
    ${notes.map((entry) => `<div class="pp-note-item"><b>${ROUND_LABELS[entry.round]}</b> ${escapeHtml(entry.review.note)}</div>`).join("")}
    <div class="pp-writelines" aria-hidden="true"></div>
  </section>
  <footer class="pp-foot">예술in · ${escapeHtml(performance.title)} · 출력일 ${new Date().toLocaleDateString("ko-KR")}</footer>
</section>`;
}

/**
 * 브라우저 인쇄 대화상자를 그대로 쓴다(PDF 저장·실제 인쇄 모두 여기서 처리).
 * 별도 창에 A4 전용 문서를 만들어 화면 스타일이 인쇄에 새지 않게 한다.
 */
export function openPrintWindow(applicants: readonly Applicant[], performance: PerformanceRef) {
  if (applicants.length === 0) return false;

  const title =
    applicants.length === 1 ? `${applicants[0]?.name ?? ""} 프로필` : `지원자 ${applicants.length}명`;
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return false;

  win.document.open();
  win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>${PRINT_STYLE}</style></head><body>${applicants.map((applicant) => printableCard(applicant, performance)).join("")}</body></html>`);
  win.document.close();
  win.addEventListener("load", () => {
    win.focus();
    win.print();
  });

  return true;
}
