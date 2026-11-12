"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useToast } from "@/components/auditions/toast";
import { DestructiveButton, FieldTextarea, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import {
  ACTOR_CHEER_MAX_LENGTH,
  deleteActorPageCheer,
  editActorPageCheer,
  getActorPageCheers,
  writeActorPageCheer,
  type ActorPageCheer,
  type ActorPageCheers,
} from "@/features/actor-pages/cheer-api";
import { actorPageRoutes } from "@/features/actor-pages/types";
import { errorMessage } from "@/features/auditions/use-audition-query";
import { fullTime, relativeTime } from "@/features/community/time";

type State =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly data: ActorPageCheers };

function agoLabel(iso: string): string {
  const relative = relativeTime(iso);
  return /^\d+(분|시간|일)$/.test(relative) ? `${relative} 전` : relative;
}

/**
 * 배우 페이지의 팬 응원. 공개 배우 페이지 응답은 보는 사람과 무관하게 같으므로 응원 글과 내 상태는 따로 읽는다. 작성자는
 * 익명이며 `N호 팬`으로만 보이고, 내 글에만 수정·삭제가 있다.
 */
export function ActorPageCheersSection({ publicId, handle, name }: {
  readonly publicId: string;
  readonly handle: string;
  readonly name: string;
}) {
  const toast = useToast();
  const titleId = useId();
  const [state, setState] = useState<State>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(() => {
    let active = true;
    getActorPageCheers(publicId)
      .then((data) => { if (active) setState({ status: "ready", data }); })
      .catch((cause) => {
        console.error("[배우 응원 글 조회 실패]", cause);
        if (active) setState({ status: "error" });
      });
    return () => { active = false; };
  }, [publicId]);

  useEffect(() => load(), [load]);

  const update = useCallback((change: (data: ActorPageCheers) => ActorPageCheers) => {
    setState((current) => current.status === "ready" ? { status: "ready", data: change(current.data) } : current);
  }, []);

  const loadMore = useCallback(async () => {
    if (state.status !== "ready" || state.data.nextBefore === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await getActorPageCheers(publicId, state.data.nextBefore);
      update((data) => ({ ...data, cheers: [...data.cheers, ...next.cheers], nextBefore: next.nextBefore, totalCount: next.totalCount }));
    } catch (cause) {
      console.error("[배우 응원 글 더 보기 실패]", cause);
      toast(errorMessage(cause, "응원 글을 더 불러오지 못했어요."), { type: "error" });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, publicId, state, toast, update]);

  if (state.status === "loading") {
    return <section aria-labelledby={titleId} className="mt-10 border-t border-border pt-8"><h2 id={titleId} className="text-lg font-bold tracking-tight">팬 응원</h2><p role="status" className="mt-4 text-sm text-muted">응원 글을 불러오는 중이에요…</p></section>;
  }
  if (state.status === "error") {
    return (
      <section aria-labelledby={titleId} className="mt-10 border-t border-border pt-8">
        <h2 id={titleId} className="text-lg font-bold tracking-tight">팬 응원</h2>
        <p role="alert" className="mt-4 text-sm text-fail">응원 글을 불러오지 못했어요.</p>
        <SecondaryButton className="mt-3" onClick={() => { setState({ status: "loading" }); load(); }}>다시 시도</SecondaryButton>
      </section>
    );
  }

  const { data } = state;
  return (
    <section aria-labelledby={titleId} className="mt-10 border-t border-border pt-8">
      <h2 id={titleId} className="text-lg font-bold tracking-tight">팬 응원 <span className="num text-muted-strong">{data.totalCount.toLocaleString("ko-KR")}</span></h2>
      <p className="mt-1 text-sm leading-6 text-muted-strong">{name} 배우에게 응원을 남겨요. 쓴 사람은 N호 팬으로만 보여요.</p>

      <div className="mt-5">
        <Composer
          me={data.me}
          publicId={publicId}
          handle={handle}
          onWritten={(cheer) => update((current) => ({ ...current, totalCount: current.totalCount + 1, cheers: [cheer, ...current.cheers] }))}
        />
      </div>

      {data.cheers.length === 0 ? (
        <p className="mt-6 rounded-card border border-border-soft bg-surface px-5 py-8 text-center text-sm text-muted-strong">아직 응원 글이 없어요. 첫 응원을 남겨 보세요.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {data.cheers.map((cheer) => (
            <CheerItem
              key={cheer.id}
              cheer={cheer}
              publicId={publicId}
              onEdited={(edited) => update((current) => ({ ...current, cheers: current.cheers.map((item) => item.id === edited.id ? edited : item) }))}
              onDeleted={() => update((current) => ({ ...current, totalCount: Math.max(0, current.totalCount - 1), cheers: current.cheers.filter((item) => item.id !== cheer.id) }))}
            />
          ))}
        </ul>
      )}

      {data.nextBefore !== null ? (
        <div className="mt-5 text-center">
          <SecondaryButton disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "불러오는 중…" : "응원 글 더 보기"}</SecondaryButton>
        </div>
      ) : null}
    </section>
  );
}

function Composer({ me, publicId, handle, onWritten }: {
  readonly me: ActorPageCheers["me"];
  readonly publicId: string;
  readonly handle: string;
  readonly onWritten: (cheer: ActorPageCheer) => void;
}) {
  const toast = useToast();
  const fieldId = useId();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  if (me.canWrite) {
    const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (pending || body.trim() === "") return;
      setPending(true);
      try {
        onWritten(await writeActorPageCheer(publicId, body));
        setBody("");
      } catch (cause) {
        console.error("[배우 응원 글 작성 실패]", cause);
        toast(errorMessage(cause, "응원 글을 남기지 못했어요."), { type: "error" });
      } finally {
        setPending(false);
      }
    };
    return (
      <form onSubmit={(event) => void submit(event)} className="grid gap-2">
        <label htmlFor={fieldId} className="sr-only">응원 글</label>
        <FieldTextarea
          id={fieldId}
          value={body}
          maxLength={ACTOR_CHEER_MAX_LENGTH}
          rows={3}
          placeholder="응원의 한마디를 남겨 주세요"
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="num text-xs text-muted">{body.length}/{ACTOR_CHEER_MAX_LENGTH}</span>
          <PrimaryButton type="submit" disabled={pending || body.trim() === ""}>{pending ? "남기는 중…" : "응원 남기기"}</PrimaryButton>
        </div>
      </form>
    );
  }
  if (!me.loggedIn) {
    return (
      <Link
        href={`/login?returnTo=${encodeURIComponent(actorPageRoutes.detail(handle))}`}
        className="inline-flex min-h-11 items-center rounded-control border border-brand bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
      >
        로그인하고 응원 남기기
      </Link>
    );
  }
  if (me.owner) {
    return <p className="rounded-card border border-border-soft bg-surface px-4 py-3 text-sm text-muted-strong">내 페이지에는 팬들이 응원을 남겨요.</p>;
  }
  return <p className="rounded-card border border-border-soft bg-surface px-4 py-3 text-sm text-muted-strong">공연사·운영자 계정으로는 응원을 남길 수 없어요. 일반 회원으로 로그인해 주세요.</p>;
}

function CheerItem({ cheer, publicId, onEdited, onDeleted }: {
  readonly cheer: ActorPageCheer;
  readonly publicId: string;
  readonly onEdited: (cheer: ActorPageCheer) => void;
  readonly onDeleted: () => void;
}) {
  const toast = useToast();
  const fieldId = useId();
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const [draft, setDraft] = useState(cheer.body);
  const itemRef = useRef<HTMLLIElement>(null);
  const returnFocusTo = useRef<"edit" | "delete" | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const scope = itemRef.current;
    if (!scope) return;
    if (mode === "edit") scope.querySelector<HTMLElement>("textarea")?.focus();
    if (mode === "confirm") scope.querySelector<HTMLElement>("[data-confirm]")?.focus();
    if (mode === "view" && returnFocusTo.current) {
      scope.querySelector<HTMLElement>(`[data-action="${returnFocusTo.current}"]`)?.focus();
      returnFocusTo.current = null;
    }
  }, [mode]);

  const run = async (action: () => Promise<void>, fallback: string) => {
    if (pending) return;
    setPending(true);
    try {
      await action();
    } catch (cause) {
      console.error("[배우 응원 글 변경 실패]", cause);
      toast(errorMessage(cause, fallback), { type: "error" });
      setPending(false);
    }
  };

  return (
    <li ref={itemRef} className="rounded-card border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="num font-bold">{cheer.fanNumber}호 팬</span>
        {cheer.mine ? <span className="rounded-full border border-brand-line bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">내 글</span> : null}
        <time dateTime={cheer.createdAt} title={fullTime(cheer.createdAt)} className="text-muted">{agoLabel(cheer.createdAt)}</time>
        {cheer.edited ? <span className="text-xs text-muted">수정됨</span> : null}
      </div>

      {mode === "edit" ? (
        <form
          className="mt-3 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim() === "") return;
            void run(async () => {
              onEdited(await editActorPageCheer(publicId, cheer.id, draft));
              setMode("view");
              setPending(false);
            }, "응원 글을 고치지 못했어요.");
          }}
        >
          <label htmlFor={fieldId} className="sr-only">응원 글 수정</label>
          <FieldTextarea id={fieldId} value={draft} maxLength={ACTOR_CHEER_MAX_LENGTH} rows={3} onChange={(event) => setDraft(event.target.value)} />
          <div className="flex items-center justify-between gap-3">
            <span className="num text-xs text-muted">{draft.length}/{ACTOR_CHEER_MAX_LENGTH}</span>
            <div className="flex gap-2">
              <TextButton onClick={() => { setDraft(cheer.body); setMode("view"); }} disabled={pending}>취소</TextButton>
              <PrimaryButton type="submit" disabled={pending || draft.trim() === ""}>저장</PrimaryButton>
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-2 whitespace-pre-line break-words leading-7">{cheer.body}</p>
      )}

      {cheer.mine && mode === "view" ? (
        <div className="mt-2 flex gap-1">
          <TextButton data-action="edit" onClick={() => { setDraft(cheer.body); returnFocusTo.current = "edit"; setMode("edit"); }}>수정</TextButton>
          <TextButton data-action="delete" onClick={() => { returnFocusTo.current = "delete"; setMode("confirm"); }}>삭제</TextButton>
        </div>
      ) : null}

      {mode === "confirm" ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">이 응원 글을 삭제할까요?</span>
          <DestructiveButton data-confirm disabled={pending} onClick={() => void run(async () => { await deleteActorPageCheer(publicId, cheer.id); onDeleted(); }, "응원 글을 삭제하지 못했어요.")}>삭제</DestructiveButton>
          <TextButton disabled={pending} onClick={() => setMode("view")}>취소</TextButton>
        </div>
      ) : null}
    </li>
  );
}
