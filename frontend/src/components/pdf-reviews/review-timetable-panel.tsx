"use client";

import styles from "./roster.module.css";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { FieldInput, FieldSelect, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { isUnauthorized } from "@/features/pdf-reviews/api";
import type { PassedContact } from "@/features/pdf-reviews/use-passed-contacts";
import { RosterContactList } from "./roster-contact-list";
import { RosterScheduleEditor, RosterScheduleActions } from "./roster-schedule-editor";
import { emptySchedule, scheduleDirty, scheduleAssignments, slotError } from "@/features/pdf-reviews/roster-schedule";
import type { ReviewKey } from "@/features/pdf-reviews/types";
import { createRoster, editRosterContact, fetchRoster, importRoster, listRosters, readRosterContact, removeRosterActor, saveRosterAssignments,
  type RosterActor, type RosterContact, type RosterDetail, type RosterSummary } from "@/features/pdf-reviews/timetables";

export function ReviewTimetablePanel({ reviewId, selected, onClose, onUnauthorized, onDirtyChange }: {
  reviewId: ReviewKey; selected: readonly PassedContact[]; onClose: () => void;
  onUnauthorized: () => void; onDirtyChange: (dirty: boolean) => void;
}) {
  const [list, setList] = useState<RosterSummary[]>([]);
  const [roster, setRoster] = useState<RosterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const creationArea = useRef<HTMLDivElement>(null);
  const creationTrigger = useRef<HTMLDivElement>(null);
  const restoreCreationFocus = useRef(false);
  useEffect(() => {
    if (!creating && !busy && restoreCreationFocus.current) {
      creationTrigger.current?.querySelector<HTMLButtonElement>("button")?.focus();
      restoreCreationFocus.current = false;
    }
  }, [creating, busy]);
  useEffect(() => {
    if (creating) creationArea.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [creating]);
  function closeCreation() {
    restoreCreationFocus.current = true;
    setCreating(false);
  }
  const [creationKey, setCreationKey] = useState(() => crypto.randomUUID());
  const [contacts, setContacts] = useState<RosterContact[]>(() => selected.map(row => ({
    entryId: String(row.entry.id), name: row.entry.applicantName ?? "",
    phone: row.contact.phone ?? "", email: row.email.email ?? "",
  })));
  const [editing, setEditing] = useState<RosterActor | null>(null);
  const [edited, setEdited] = useState<RosterContact | null>(null);
  const [schedule, setSchedule] = useState(emptySchedule);
  const [rosterView, setRosterView] = useState<"schedule" | "contacts">("schedule");
  const [contactsDirty, setContactsDirty] = useState(false);
  const editDirty = !!editing && !!edited && (editing.name !== edited.name
    || (editing.phone ?? "") !== edited.phone || editing.email !== edited.email);
  const dirty = title.length > 0 || contactsDirty || editDirty || scheduleDirty(schedule);
  useEffect(() => { onDirtyChange(dirty || busy); }, [dirty, busy, onDirtyChange]);
  const mounted = useRef(true);
  const loadController = useRef<AbortController | null>(null);
  const unauthorized = useEffectEvent(onUnauthorized);
  const initialError = useEffectEvent((cause: unknown) => {
    if (isUnauthorized(cause)) unauthorized();
    else setError("일정 목록을 불러오지 못했습니다. 다시 불러와 주세요.");
  });

  useEffect(() => {
    const controller = new AbortController();
    mounted.current = true;
    void listRosters(controller.signal).then(setList).catch(cause => {
      if (!controller.signal.aborted) initialError(cause);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { mounted.current = false; controller.abort(); loadController.current?.abort(); };
  }, []);

  function close() {
    if (busy || (dirty && !window.confirm("저장하지 않은 입력을 버리고 돌아갈까요?"))) return;
    onDirtyChange(false); onClose();
  }
  function fail(cause: unknown) {
    if (!mounted.current) return;
    if (isUnauthorized(cause)) { setRoster(null); setContacts([]); setEdited(null); onUnauthorized(); }
    else setError(cause instanceof Error ? cause.message : "처리하지 못했습니다. 다시 시도해 주세요.");
  }
  function accept(detail: RosterDetail) {
    setRoster(detail);
    setList(current => [{ id: detail.id, title: detail.title, actorCount: detail.actors.length }, ...current.filter(item => item.id !== detail.id)]);
  }
  async function choose(id: number) {
    if ((editDirty || scheduleDirty(schedule)) && !window.confirm("저장하지 않은 연락처·배정 수정을 버릴까요?")) return;
    setSchedule(emptySchedule());
    loadController.current?.abort();
    const controller = new AbortController(); loadController.current = controller;
    setRoster(null); setEditing(null); setEdited(null); setError(""); setMessage(""); setBusy(true);
    try { const detail = await fetchRoster(id, controller.signal); if (!controller.signal.aborted) accept(detail); }
    catch (cause) { if (!controller.signal.aborted) fail(cause); }
    finally { if (!controller.signal.aborted && mounted.current) setBusy(false); }
  }
  async function create() {
    if (!title.trim() || title.trim().length > 60) { setError("일정 이름을 1~60자로 입력해 주세요."); return; }
    if ((editDirty || scheduleDirty(schedule)) && !window.confirm("저장하지 않은 연락처·배정 수정을 버리고 새 일정을 만들까요?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const detail = await createRoster(title.trim(), creationKey);
      if (!mounted.current) return;
      accept(detail); setSchedule(emptySchedule()); setTitle(""); setCreationKey(crypto.randomUUID()); setEditing(null); setEdited(null); closeCreation();
      setMessage(contacts.length ? "일정을 만들었습니다. 선택한 사람을 확인한 뒤 등록해 주세요." : "일정을 만들었습니다. 합격자 명단에서 사람을 선택해 추가해 주세요.");
    } catch (cause) { fail(cause); }
    finally { if (mounted.current) setBusy(false); }
  }
  const existingIds = new Set(roster?.actors.map(actor => actor.sourceApplicantId));
  const pending = contacts.filter(contact => !existingIds.has(contact.entryId));
  const checked = pending.map(readRosterContact);
  const phones = new Set(roster?.actors.map(actor => actor.phone).filter(Boolean));
  const duplicates = checked.some(item => item.value.phone && (phones.has(item.value.phone) || !phones.add(item.value.phone)));
  const validation = checked.find(item => item.error)?.error
    || (duplicates ? "같은 전화번호가 있습니다. 명단과 연락처를 확인해 주세요." : "")
    || ((roster?.actors.length ?? 0) + pending.length > 300 ? "한 일정에는 최대 300명까지 등록할 수 있습니다." : "");
  async function add() {
    if (!roster || validation || !pending.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const detail = await importRoster(roster.id, reviewId, checked.map(item => item.value));
      if (!mounted.current) return;
      accept(detail); setContacts([]); setContactsDirty(false); setMessage("선택한 지원자를 일정 명단에 등록했습니다. 시간은 아직 배정되지 않았습니다.");
    } catch (cause) { fail(cause); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function saveContact() {
    if (!roster || !editing || !edited) return;
    const result = readRosterContact(edited);
    if (result.error) { setError(result.error); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const detail = await editRosterContact(roster.id, editing, result.value);
      if (!mounted.current) return;
      accept(detail); setEditing(null); setEdited(null); setMessage("연락처를 저장했습니다.");
    } catch (cause) { fail(cause); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function saveSchedule() {
    if (!roster || !Object.keys(schedule.drafts).length
      || Object.values(schedule.drafts).some(draft => slotError(draft.date, draft.time))) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const detail = await saveRosterAssignments(roster.id, scheduleAssignments(schedule));
      if (!mounted.current) return;
      accept(detail); setSchedule(current => ({ ...current, drafts: {} }));
      setMessage("날짜와 시간 배정을 저장했습니다. 안내 메시지는 발송되지 않았습니다.");
    } catch (cause) { fail(cause); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function remove(actor: RosterActor) {
    if (!roster || !window.confirm(`${actor.name}님을 이 일정 명단에서 제외할까요? 원래 지원서와 심사 결과는 유지됩니다.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const detail = await removeRosterActor(roster.id, actor.id);
      if (!mounted.current) return;
      accept(detail);
      setSchedule(current => { const drafts = { ...current.drafts }; delete drafts[actor.id];
        return { ...current, drafts, selected: current.selected.filter(id => id !== actor.id) }; });
      if (editing?.id === actor.id) { setEditing(null); setEdited(null); }
      setMessage("일정 명단에서 제외했습니다. 합격자 명단에서 다시 가져올 수 있습니다.");
    } catch (cause) { fail(cause); }
    finally { if (mounted.current) setBusy(false); }
  }
  const feedback = <>
    {error && <div role="alert" className="rounded-control bg-fail-bg p-3 text-sm text-fail">{error}<SecondaryButton className="ml-2" disabled={busy} onClick={() => { if (roster) void choose(roster.id); else { setLoading(true); void listRosters().then(setList).catch(fail).finally(() => { if (mounted.current) setLoading(false); }); } }}>다시 불러오기</SecondaryButton></div>}
    {message && <p role="status" className="rounded-control bg-brand-soft p-3 text-sm text-brand">{message}</p>}
  </>;
  return <section className={`${styles.panel} space-y-4 py-4`} aria-labelledby="review-roster-title">
    <header className={styles.header}><div>
      <h2 id="review-roster-title" className="text-xl font-bold">오디션 일정 명단</h2>
      <p className="mt-1 text-sm leading-6 text-muted-strong">여러 심사함의 합격자를 모아 날짜와 시간을 배정하세요.</p>
    </div><TextButton disabled={busy} onClick={close}>합격자 명단으로</TextButton></header>
    <div className="space-y-3 rounded-card border border-border bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-semibold">관리할 일정<FieldSelect className="mt-2 w-full" value={roster?.id ?? ""} disabled={busy || loading} onChange={event => { if (event.target.value) void choose(Number(event.target.value)); }}>
          <option value="">{loading ? "불러오는 중…" : list.length ? "일정을 선택해 주세요" : "등록된 일정이 없습니다"}</option>
          {list.map(item => <option key={item.id} value={item.id}>{item.title} · {item.actorCount}명</option>)}
        </FieldSelect></label>
        <div ref={creationTrigger}><SecondaryButton disabled={busy || loading} aria-expanded={creating} aria-controls="new-roster-form"
          onClick={() => setCreating(true)}>새 일정 만들기{title && !creating ? " · 작성 중" : ""}</SecondaryButton></div>
      </div>
      {roster && <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-strong" aria-label="일정 배정 현황">
        <span>전체 <strong className="num text-foreground">{roster.actors.length}</strong>명</span>
        <span>배정 <strong className="num text-foreground">{roster.actors.filter(actor => actor.slot).length}</strong>명</span>
        <span>미배정 <strong className="num text-foreground">{roster.actors.filter(actor => !actor.slot).length}</strong>명</span>
      </p>}
      {creating && <div ref={creationArea} id="new-roster-form" className="space-y-3 border-t border-border pt-4">
        <label htmlFor="roster-title" className="block text-sm font-semibold">새 일정 이름</label>
        <p className="text-sm text-muted-strong">별도의 일정을 만듭니다. 생성 후 선택한 사람을 등록해 주세요.</p>
        <div className="flex flex-wrap gap-2">
          <FieldInput id="roster-title" className="min-w-0 flex-1 basis-60" placeholder="예: 가을 공연 2차 오디션" value={title} disabled={busy} maxLength={60} onChange={event => setTitle(event.target.value)} />
          <PrimaryButton disabled={busy || !title.trim()} onClick={() => void create()}>일정 만들기</PrimaryButton>
          <SecondaryButton disabled={busy} onClick={closeCreation}>닫기</SecondaryButton>
        </div>
      </div>}
    </div>
    {!roster?.actors.length && feedback}
    {contacts.length > 0 && <section className="space-y-3" aria-label="가져올 지원자 확인">
      <h3 className="font-semibold">선택한 {contacts.length}명 확인</h3><p className="text-sm text-muted-strong">PDF에서 읽은 값입니다. 이름과 연락처를 확인해 주세요. 전화번호와 이메일은 선택 입력입니다.</p>
      <div className="space-y-3">{contacts.map((contact, index) => <div key={contact.entryId} className="rounded-control border border-border p-4">
        <div className="mb-3 flex items-center justify-between gap-2"><span className="text-sm text-muted-strong">{selected.find(row => String(row.entry.id) === contact.entryId)?.roleName}</span>
          {existingIds.has(contact.entryId) ? <span className="text-sm text-muted">이미 등록됨</span> : <SecondaryButton disabled={busy} onClick={() => { setContacts(current => current.filter(item => item.entryId !== contact.entryId)); setContactsDirty(true); }}>선택 제외</SecondaryButton>}</div>
        <ContactFields value={contact} disabled={busy || existingIds.has(contact.entryId)} prefix={`import-${index}`} onChange={value => { setContacts(current => current.map(item => item.entryId === contact.entryId ? value : item)); setContactsDirty(true); }} />
      </div>)}</div>
      {validation && <p role="alert" className="text-sm text-fail">{validation}</p>}
      <PrimaryButton disabled={!roster || busy || !!validation || !pending.length} onClick={() => void add()}>{busy ? "처리 중…" : `선택한 ${pending.length}명 일정에 등록`}</PrimaryButton>
      {!roster && <p className="text-sm text-muted">등록할 일정을 먼저 선택하거나 만들어 주세요.</p>}
    </section>}
    {roster && <section aria-label="등록된 일정 명단" className="space-y-3">
      <h3 className="sr-only">{roster.title} · {roster.actors.length}명</h3>
      {roster.actors.length > 0 && <div role="group" aria-label="명단 관리 보기" className={styles.viewSwitch}>
        <SecondaryButton aria-pressed={rosterView === "schedule"} onClick={() => setRosterView("schedule")}
          className={rosterView === "schedule" ? "border-brand-line bg-brand-soft text-brand" : ""}>날짜·시간 배정</SecondaryButton>
        <SecondaryButton aria-pressed={rosterView === "contacts"} onClick={() => setRosterView("contacts")}
          className={rosterView === "contacts" ? "border-brand-line bg-brand-soft text-brand" : ""}>연락처 관리{editDirty ? " · 수정 중" : ""}</SecondaryButton>
      </div>}
      {roster.actors.length > 0 && rosterView === "schedule" && <RosterScheduleEditor actors={roster.actors} value={schedule} onChange={setSchedule} disabled={busy} />}
      {!roster.actors.length ? <p className="py-6 text-sm text-muted">아직 등록된 사람이 없습니다.</p>
        : rosterView === "contacts" && <RosterContactList actors={roster.actors} editing={editing} edited={edited} disabled={busy} onChange={setEdited}
          onEdit={actor => {
            if (editDirty && !window.confirm("저장하지 않은 연락처 수정을 버릴까요?")) return false;
            setEditing(actor); setEdited({ entryId: actor.sourceApplicantId, name: actor.name, phone: actor.phone ?? "", email: actor.email }); setError("");
            return true;
          }} onSave={() => void saveContact()} onRemove={actor => void remove(actor)} onCancel={() => {
            if (editDirty && !window.confirm("저장하지 않은 연락처 수정을 취소할까요?")) return;
            setEditing(null); setEdited(null);
          }} />}
      {roster.actors.length > 0 && (rosterView === "schedule" || scheduleDirty(schedule)
        ? <RosterScheduleActions value={schedule} onChange={setSchedule} onSave={() => void saveSchedule()} disabled={busy} feedback={feedback} context={rosterView === "contacts"} />
        : feedback)}

    </section>}
  </section>;
}

function ContactFields({ value, onChange, disabled, prefix }: { value: RosterContact; onChange: (value: RosterContact) => void; disabled: boolean; prefix: string }) {
  return <div className="grid gap-3 md:grid-cols-3">{([
    ["name", "이름", "text"], ["phone", "전화번호 (선택)", "tel"], ["email", "이메일 (선택)", "email"],
  ] as const).map(([key, label, type]) => <label key={key} className="text-sm font-medium" htmlFor={`${prefix}-${key}`}>{label}
    <FieldInput className="mt-1 w-full" id={`${prefix}-${key}`} type={type} value={value[key]} disabled={disabled} autoComplete="off" onChange={event => onChange({ ...value, [key]: event.target.value })} />
  </label>)}</div>;
}
