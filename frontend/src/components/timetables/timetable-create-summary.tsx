import { PrimaryButton } from "@/components/ui/controls";
import { SiteIcon } from "@/components/ui/site-icon";
import { readSettingForm, selectedDates, type SettingForm } from "@/features/timetables/setting-form";
import { formatShortDate, slotsOf } from "@/features/timetables/time";
import type { TimetableProfile } from "@/features/timetables/types";

export function TimetableCreateSummary({ profile, setting, submitting }: {
  readonly profile: TimetableProfile;
  readonly setting: SettingForm;
  readonly submitting: boolean;
}) {
  const dates = selectedDates(setting);
  const preview = readSettingForm(setting).setting;
  const slots = preview ? slotsOf(preview).length : null;
  const dateLabel = dates.length
    ? dates.slice(0, 2).map(formatShortDate).join(" · ") + (dates.length > 2 ? " 외 " + (dates.length - 2) + "일" : "")
    : "날짜를 선택해주세요";
  return <aside className="timetable-create-aside">
    <section className="workspace-panel timetable-create-summary" aria-labelledby="timetable-summary-title">
      <p className="workspace-eyebrow">만들어질 일정표</p>
      <h2 id="timetable-summary-title">{profile.title.trim() || "작품명을 입력해주세요"}</h2>
      <p className="workspace-description">{profile.organizerName.trim() || "단체명을 입력해주세요"}</p>
      <dl>
        <div><dt>선택한 날짜</dt><dd>{dateLabel}</dd></div>
        <div><dt>1회 진행 시간</dt><dd><span className="num">{setting.slotMinutes || "—"}</span>분</dd></div>
        <div><dt>동시 오디션 인원</dt><dd><span className="num">{setting.slotCapacity || "—"}</span>명</dd></div>
        <div><dt>전체 시간 칸</dt><dd><span className="num">{slots ?? "—"}</span>칸</dd></div>
      </dl>
      <div className="timetable-create-total"><span>최대 배정 인원</span><strong className="num">{preview && slots !== null ? slots * preview.slotCapacity : "—"}<small>명</small></strong></div>
      <PrimaryButton type="submit" disabled={submitting} aria-busy={submitting || undefined} className="min-h-12 w-full">
        {submitting ? "생성 중…" : "일정표 만들기"}
      </PrimaryButton>
      <p className="timetable-create-footnote">생성 후 관리 링크를 꼭 보관해주세요.<br />관리 링크에서 합격자를 등록할 수 있어요.</p>
    </section>
    <div id="timetable-guide" className="workspace-note timetable-create-guide">
      <SiteIcon name="about" size={18} />
      <p>일정표는 로그인 없이 만들 수 있어요. 만든 뒤 합격자 등록 → 시간 배정 → 확정 순서로 진행됩니다.</p>
    </div>
  </aside>;
}
