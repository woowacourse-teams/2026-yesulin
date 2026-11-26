"use client";

import { useEffect, useState } from "react";
import { FieldTextarea } from "@/components/ui/controls";
import {
  formatReminderDeadline, formatReminderMessage, getOpenChatReminderPosts, reminderDeadline, REMINDER_TIMING_LABELS,
} from "@/features/admin/openchat-reminder";
import { kstToday } from "@/features/audition-posts/format";
import type { ReminderTiming } from "@/features/audition-posts/openchat-reminder-tag";
import { auditionPostRoutes, type AuditionPostSummary } from "@/features/audition-posts/types";
import { AdminActionButton, AdminFilterButton } from "./admin-shell";

const TIMINGS = ["d0", "d1"] as const;
type LoadResult = { date: string; refreshToken: number; posts: AuditionPostSummary[] | null };
type Draft = { key: string; original: string; text: string };

export function AdminOpenChatReminder({ refreshToken }: { readonly refreshToken: number }) {
  const [today, setToday] = useState(() => kstToday());
  const [timing, setTiming] = useState<ReminderTiming>("d1");
  const [result, setResult] = useState<LoadResult | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState("");
  const date = reminderDeadline(today, timing);
  const current = (result?.date === date && result.refreshToken === refreshToken && result) || undefined;
  const chosen = current?.posts?.filter(post => selected.includes(post.id)) ?? [];
  const selectionKey = JSON.stringify([date, timing, chosen.map(({ id, title }) => [id, title])]);
  const canCopy = Boolean(draft?.key === selectionKey && draft.text.trim() && chosen.length);

  useEffect(() => {
    let active = true;
    getOpenChatReminderPosts(date).then(
      posts => {
        if (!active) return;
        const available = new Set(posts.map(post => post.id));
        setSelected(ids => ids.filter(id => available.has(id)));
        setResult({ date, refreshToken, posts });
      },
      () => { if (active) setResult({ date, refreshToken, posts: null }); },
    );
    return () => { active = false; };
  }, [date, refreshToken, retry]);

  function refreshDate() {
    const now = kstToday();
    if (now === today) return false;
    setToday(now);
    setSelected([]);
    setStatus("날짜가 바뀌었어요. 새 목록에서 공고를 다시 골라 주세요.");
    return true;
  }

  function changeTiming(next: ReminderTiming) {
    if (!refreshDate()) setStatus("");
    if (next === timing) return;
    setTiming(next);
    setSelected([]);
  }

  function togglePost(postId: number, checked: boolean) {
    if (refreshDate()) return;
    setStatus("");
    setSelected(ids => {
      if (checked) return [...ids, postId];
      return ids.filter(id => id !== postId);
    });
  }

  function generate() {
    if (refreshDate() || !chosen.length) return;
    if (draft && draft.original !== draft.text && !window.confirm("수정한 문구를 새 문구로 바꿀까요?")) return;
    const text = formatReminderMessage(date, timing, chosen);
    setDraft({ key: selectionKey, original: text, text });
    setStatus("");
  }

  async function copy() {
    if (refreshDate() || !draft || !canCopy) return;
    try {
      await navigator.clipboard.writeText(draft.text);
      setStatus("오픈채팅에 보낼 문구를 복사했어요.");
    } catch {
      setStatus("자동 복사를 할 수 없어요. 미리보기에서 문구를 직접 복사해 주세요.");
    }
  }

  function retryPosts() {
    if (refreshDate()) return;
    setResult(null);
    setRetry(value => value + 1);
  }

  return (
    <section aria-labelledby="openchat-reminder-heading" className="space-y-4 rounded-card border border-border bg-card p-4 sm:p-5">
      <h2 id="openchat-reminder-heading" className="text-lg font-bold">마감 안내 만들기</h2>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="공고 마감일">
            {TIMINGS.map(value => (
              <AdminFilterButton key={value} type="button" pressed={timing === value} onClick={() => changeTiming(value)}>
                {REMINDER_TIMING_LABELS[value]} 마감
              </AdminFilterButton>
            ))}
            <span className="text-sm text-muted">{formatReminderDeadline(date)}</span>
          </div>
          {!current && <p role="status" className="text-sm text-muted">마감 공고를 불러오는 중이에요.</p>}
          {current && !current.posts && (
            <p role="alert" className="text-sm text-fail">
              마감 공고를 불러오지 못했어요. <button type="button" onClick={retryPosts} className="font-semibold underline">다시 시도</button>
            </p>
          )}
          {current && current.posts?.length === 0 && <p className="text-sm text-muted">해당 날짜에 마감되는 공개 공고가 없어요.</p>}
          {current?.posts && current.posts.length > 0 && (
            <ReminderPostList posts={current.posts} selected={selected} onToggle={togglePost} />
          )}
          <AdminActionButton type="button" disabled={!chosen.length} onClick={generate}>문구 만들기</AdminActionButton>
        </div>
        {draft && (
          <div className="min-w-0 space-y-2">
            <label htmlFor="openchat-reminder-preview" className="text-sm font-semibold">문구 미리보기</label>
            <FieldTextarea id="openchat-reminder-preview" rows={12} value={draft.text} className="w-full resize-y"
              onChange={event => { setDraft({ ...draft, text: event.target.value }); setStatus(""); }} />
            {draft.key !== selectionKey && <p className="text-sm text-muted">공고 선택이나 날짜가 바뀌었어요. 문구를 다시 만들어 주세요.</p>}
            <AdminActionButton type="button" tone="primary" disabled={!canCopy} onClick={() => void copy()}>문구 복사</AdminActionButton>
          </div>
        )}
      </div>
      {status && <p role="status" className="text-sm text-muted-strong">{status}</p>}
    </section>
  );
}

function ReminderPostList({ posts, selected, onToggle }: {
  readonly posts: AuditionPostSummary[];
  readonly selected: number[];
  readonly onToggle: (postId: number, checked: boolean) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">안내할 공고</legend>
      <ul className="divide-y divide-border border-y border-border">
        {posts.map(post => (
          <li key={post.id} className="flex items-center gap-2">
            <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 text-sm">
              <input type="checkbox" checked={selected.includes(post.id)} onChange={event => onToggle(post.id, event.target.checked)} className="size-4 shrink-0 accent-brand" />
              <span className="wrap-anywhere">{post.title}</span>
            </label>
            <a href={auditionPostRoutes.detail(post.id)} target="_blank" rel="noreferrer" aria-label={`${post.title} 공고 열기 (새 창)`}
              className="flex min-h-11 shrink-0 items-center px-2 text-xs text-muted-strong underline underline-offset-4">공고 보기</a>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
