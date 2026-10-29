"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { FieldSelect } from "@/components/ui/controls";
import {
  AdminApiError,
  fetchAuditionPostOwners,
  fetchProducers,
  fillAuditionPostAuthors,
  linkAuditionPostAuthor,
  unlinkAuditionPostAuthor,
} from "@/features/admin/api";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import type {
  AdminAuditionPostAuthorFill,
  AdminAuditionPostAuthorLink,
  AdminAuditionPostOwner,
  AdminAuditionPostOwnerOverview,
  AdminProducer,
  AdminUnlinkedAuthor,
} from "@/features/admin/types";
import { formatDateTime } from "./admin-format";
import { AdminAuditionPostTabs } from "./admin-audition-post-tabs";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminActionLink, AdminEmptyState, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "failed" | "unauthorized";

const isUnauthorized = (cause: unknown) => cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403);
const messageOf = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

function producerLabel(producer: AdminProducer) {
  return `${producer.companyName ?? "회사명 없음"} · ${producer.email} · 회원 #${producer.memberId}${producer.status === "PENDING" ? " (이메일 인증 대기)" : ""}`;
}

/**
 * 공고를 기획사별로 보고, OTR 작성자를 기획사에 자동 연결한다. 연결하면 그 작성자의 기존 공고 중 기획사가 없는 공고와 앞으로
 * 가져올 공고가 그 기획사에 연결되어, 공개 화면에 기획사 이름으로 보이고 기획사가 직접 고칠 수 있다. 자동 연결은 닉네임이 아닌
 * OTR 회원 번호로 하므로, 번호를 읽기 전에 가져온 공고는 먼저 번호를 읽어야 한다.
 */
export function AdminAuditionPostOwners() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [overview, setOverview] = useState<AdminAuditionPostOwnerOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  /** 가입 회원 목록. 불러오지 못했으면 null이고, 빈 목록과 구분해 오류를 보인다. */
  const [producers, setProducers] = useState<readonly AdminProducer[] | null>(null);
  const [producerError, setProducerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fill, setFill] = useState<AdminAuditionPostAuthorFill | null>(null);

  /** 회원 목록을 못 읽어도 연결 현황은 보여 준다. 권한이 없으면 어느 쪽이든 권한 화면으로 보낸다. */
  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchAuditionPostOwners(), fetchProducers()])
      .then(([owners, members]) => {
        if (!active) return;
        if ([owners, members].some((result) => result.status === "rejected" && isUnauthorized(result.reason))) {
          setPhase("unauthorized");
          return;
        }
        if (members.status === "fulfilled") {
          setProducers(members.value);
          setProducerError(null);
        } else {
          setProducers(null);
          setProducerError(messageOf(members.reason, "가입 회원 목록을 불러오지 못했어요."));
        }
        if (owners.status === "rejected") {
          setError(messageOf(owners.reason, "회원 연결 정보를 불러오지 못했습니다."));
          setPhase("failed");
          return;
        }
        setOverview(owners.value);
        setError(null);
        setPhase("ready");
      });
    return () => { active = false; };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  const run = async (action: () => Promise<string | null>, fallback: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setNotice(await action());
      reload();
      return true;
    } catch (cause) {
      if (isUnauthorized(cause)) {
        setPhase("unauthorized");
        return false;
      }
      setError(cause instanceof Error ? cause.message : fallback);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const link = (author: AdminUnlinkedAuthor, ownerId: number) => run(async () => {
    if (!author.sourceAuthorId) return null;
    const result = await linkAuditionPostAuthor(author.source, author.sourceAuthorId, ownerId);
    return `OTR ${author.authorName}(#${result.sourceAuthorId}) → ${result.ownerName} 회원에게 연결했어요. 기존 공고 ${result.connectedPostCount}건을 연결했고, 이후 가져오는 공고도 이 회원의 ‘내 오디션 공고’에 표시돼요.`;
  }, "원문 작성자를 연결하지 못했어요.");

  const unlink = (owner: AdminAuditionPostOwner, authorLink: AdminAuditionPostAuthorLink) => run(async () => {
    await unlinkAuditionPostAuthor(authorLink.id);
    return `${authorLink.sourceAuthorName}(#${authorLink.sourceAuthorId}) 자동 연결을 해제했어요. 이미 ${owner.companyName ?? "기획사"}에 연결된 공고는 그대로예요.`;
  }, "자동 연결을 해제하지 못했어요.");

  const readAuthors = (beforeId: number | null) => run(async () => {
    const result = await fillAuditionPostAuthors(beforeId);
    setFill(result);
    return null;
  }, "원문 작성자 번호를 읽지 못했어요.");

  if (phase === "unauthorized") return <AdminSessionEnded />;

  return (
    <AdminShell
      current="posts"
      title="공고 관리"
      description="OTR 작성자를 예술in에 가입한 기획사·제작사 회원에게 연결해요. 연결한 회원은 로그인 후 자기 공고를 확인하고 수정할 수 있어요."
      actions={<AdminActionButton onClick={reload}>새로고침</AdminActionButton>}
    >
      <AdminAuditionPostTabs current="owners" />
      <section aria-label="회원 연결 안내" className="rounded-card border border-brand-line bg-brand-soft p-4 text-sm leading-6 sm:px-5">
        <h2 className="font-semibold">OTR 작성자 → 가입 회원 → 내 오디션 공고</h2>
        <p className="mt-1 text-muted-strong">OTR 작성자 이름·회원 번호와 가입 회원의 회사명·이메일을 확인한 뒤 연결해 주세요. 다른 회원에게 연결되지 않은 기존 공고와 이후 가져오는 공고가 함께 연결돼요.</p>
        <p className="mt-1 text-muted-strong">공연사 정보는 공고에 표시할 공개 프로필이에요. 로그인 후 보이는 공고 목록은 이곳에서 가입 회원에게 연결해 주세요.</p>
      </section>
      {notice ? <p role="status" className="rounded-control border border-pass/30 bg-pass-bg px-4 py-3 text-sm text-pass">{notice}</p> : null}
      {error ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {error} {phase === "failed" ? <button type="button" onClick={reload} className="font-semibold underline">다시 시도</button> : null}
        </p>
      ) : null}
      {phase === "loading" ? <p role="status" className="text-sm text-muted">회원 연결 정보를 불러오는 중이에요.</p> : null}

      {phase === "ready" && overview ? (
        <>
          <section aria-labelledby="unlinked-title" className="flex flex-col gap-3">
            <div>
              <h2 id="unlinked-title" className="text-base font-semibold">
                회원에게 연결할 OTR 작성자 <span className="num ml-1 text-sm font-normal text-muted">{overview.unlinkedAuthors.length}명</span>
              </h2>
              <p className="mt-1 text-sm text-muted">공고가 많은 순서예요. 가입 회원이 없다면 먼저 기획사·제작사 회원가입을 안내해 주세요.</p>
            </div>
            {overview.missingAuthorIdCount > 0 || fill ? (
              <FillPanel missing={overview.missingAuthorIdCount} fill={fill} busy={busy} onRead={(beforeId) => void readAuthors(beforeId)} />
            ) : null}
            {overview.unlinkedAuthors.length === 0 ? (
              <AdminEmptyState title="현재 회원에게 연결할 OTR 작성자가 없어요" />
            ) : (
              <ul className="flex flex-col gap-2">
                {overview.unlinkedAuthors.map((author) => (
                  <UnlinkedAuthorRow
                    key={`${author.source}-${author.sourceAuthorId ?? `@${author.authorName}`}`}
                    author={author}
                    producers={producers}
                    producerError={producerError}
                    busy={busy}
                    onLink={(ownerId) => link(author, ownerId)}
                  />
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="owner-list-title" className="flex flex-col gap-3">
            <h2 id="owner-list-title" className="text-base font-semibold">
              공고가 연결된 가입 회원 <span className="num ml-1 text-sm font-normal text-muted">{overview.owners.length}명</span>
            </h2>
            {overview.owners.length === 0 ? (
              <AdminEmptyState title="아직 공고가 연결된 회원이 없어요" description="위에서 OTR 작성자와 가입 회원을 연결해 주세요." />
            ) : (
              <ul className="flex flex-col gap-3">
                {overview.owners.map((owner) => (
                  <OwnerRow key={owner.ownerId} owner={owner} producer={producers?.find((member) => member.memberId === owner.ownerId)} busy={busy} onUnlink={(authorLink) => void unlink(owner, authorLink)} />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </AdminShell>
  );
}

function OwnerRow({ owner, producer, busy, onUnlink }: {
  readonly owner: AdminAuditionPostOwner;
  readonly producer: AdminProducer | undefined;
  readonly busy: boolean;
  readonly onUnlink: (authorLink: AdminAuditionPostAuthorLink) => void;
}) {
  return (
    <li className="rounded-card border border-border bg-card p-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 break-words">
          <h3 className="text-base font-semibold">{owner.companyName ?? `가입 회원 #${owner.ownerId}`}</h3>
          <p className="mt-1 text-xs text-muted-strong">{producer ? `${producer.email} · ` : ""}예술in 회원 #{owner.ownerId}{producer?.status === "PENDING" ? " · 이메일 인증 후 공고 확인 가능" : ""}</p>
        </div>
        <span className="text-sm text-muted-strong">
          공개 <span className="num font-semibold">{owner.publishedCount}</span> · 검토 전 <span className="num font-semibold">{owner.pendingCount}</span> · 숨김 <span className="num font-semibold">{owner.hiddenCount}</span>
        </span>
        {owner.latestCreatedAt ? <span className="text-xs text-muted">최근 등록 {formatDateTime(owner.latestCreatedAt)}</span> : null}
        <AdminActionLink href={adminAuditionPostRoutes.byOwner(owner.ownerId)} className="ml-auto">공고 보기</AdminActionLink>
      </div>
      {owner.authorLinks.length > 0 ? (
        <ul aria-label="자동 연결된 OTR 작성자" className="mt-3 flex flex-wrap gap-2">
          {owner.authorLinks.map((authorLink) => (
            <li key={authorLink.id} className="flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft py-1 pl-3 pr-1 text-sm">
              <span>{authorLink.source} {authorLink.sourceAuthorName} <span className="num text-muted-strong">#{authorLink.sourceAuthorId}</span></span>
              <button
                type="button"
                disabled={busy}
                onClick={() => onUnlink(authorLink)}
                aria-label={`${authorLink.sourceAuthorName} 자동 연결 해제`}
                className="min-h-8 rounded-full px-2 text-xs font-semibold text-muted-strong hover:bg-white hover:text-fail disabled:opacity-50"
              >
                해제
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">자동 연결된 OTR 작성자가 없어요.</p>
      )}
    </li>
  );
}

function UnlinkedAuthorRow({ author, producers, producerError, busy, onLink }: {
  readonly author: AdminUnlinkedAuthor;
  readonly producers: readonly AdminProducer[] | null;
  readonly producerError: string | null;
  readonly busy: boolean;
  readonly onLink: (ownerId: number) => Promise<boolean>;
}) {
  const selectId = useId();
  const [choosing, setChoosing] = useState(false);
  const [selected, setSelected] = useState("");
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border bg-card px-4 py-3 text-sm sm:px-5">
      <strong className="min-w-0 break-words font-semibold">{author.authorName || "이름 없음"}</strong>
      <span className="num text-muted-strong">{author.sourceAuthorId ? `${author.source} #${author.sourceAuthorId}` : "번호 없음"}</span>
      <span className="text-muted">공고 <span className="num">{author.postCount}</span>건 · 최근 {formatDateTime(author.latestCreatedAt)}</span>
      {!author.sourceAuthorId ? (
        <span className="ml-auto text-xs text-muted">번호를 읽어야 연결할 수 있어요</span>
      ) : choosing ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <label htmlFor={selectId} className="w-full font-medium">{author.authorName}의 공고를 관리할 가입 회원</label>
          <FieldSelect id={selectId} value={selected} disabled={busy || !producers?.length} onChange={(event) => setSelected(event.target.value)} className="w-full min-w-0 sm:w-96">
            <option value="" disabled>{!producers ? "가입 회원 목록을 불러오지 못했어요" : producers.length > 0 ? "회사명·이메일을 확인하고 회원을 선택해 주세요" : "가입한 기획사·제작사 회원이 없어요"}</option>
            {producers?.map((producer) => <option key={producer.memberId} value={producer.memberId}>{producerLabel(producer)}</option>)}
          </FieldSelect>
          <AdminActionButton tone="primary" disabled={busy || !selected} onClick={() => void onLink(Number(selected)).then((linked) => { if (linked) setChoosing(false); })}>이 회원에게 공고 연결</AdminActionButton>
          <AdminActionButton disabled={busy} onClick={() => setChoosing(false)}>취소</AdminActionButton>
          {producerError ? <p role="alert" className="w-full text-xs text-fail">{producerError} 위의 새로고침을 눌러 다시 불러와 주세요.</p> : null}
          {producers?.find((producer) => producer.memberId === Number(selected))?.status === "PENDING" ? <p className="w-full text-xs text-warn">이 회원은 이메일 인증 대기 중이에요. 인증을 마치면 연결된 공고를 확인할 수 있어요.</p> : null}
        </div>
      ) : (
        <AdminActionButton disabled={busy} onClick={() => setChoosing(true)} className="ml-auto">가입 회원 선택</AdminActionButton>
      )}
    </li>
  );
}

function FillPanel({ missing, fill, busy, onRead }: {
  readonly missing: number;
  readonly fill: AdminAuditionPostAuthorFill | null;
  readonly busy: boolean;
  readonly onRead: (beforeId: number | null) => void;
}) {
  const finished = missing === 0 || (fill !== null && fill.nextBeforeId === null);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-warn/30 bg-warn-bg px-4 py-3 text-sm sm:px-5">
      <p className="min-w-0 flex-1">
        {missing === 0 ? "OTR 공고의 회원 번호를 모두 읽었어요." : (
          <>
            OTR 회원 번호를 아직 읽지 않은 공고가 <span className="num font-semibold">{missing}</span>건 있어요. 번호가 있어야 자동 연결할 수 있어요.
            {finished ? " 끝까지 읽었어요. 남은 공고는 OTR에 번호가 없거나 내려간 공고예요." : " 한 번에 20건씩 OTR에서 읽어요."}
          </>
        )}
      </p>
      {fill ? (
        <p role="status" className="w-full text-xs text-muted-strong sm:order-last">
          방금 <span className="num">{fill.checked}</span>건 읽음 · <span className="num">{fill.filled}</span>건 번호 채움 · <span className="num">{fill.connected}</span>건 자동 연결
          {fill.failed > 0 ? <> · <span className="num">{fill.failed}</span>건 못 읽음</> : null}
        </p>
      ) : null}
      {finished ? null : (
        <AdminActionButton disabled={busy} onClick={() => onRead(fill?.nextBeforeId ?? null)}>
          {busy ? "읽는 중…" : fill ? "이어서 읽기" : "OTR에서 번호 읽기"}
        </AdminActionButton>
      )}
    </div>
  );
}
