import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPdfReview, isUnauthorized, listPdfReviews } from "./api";
import { sameKey, type ReviewDetail, type ReviewEntry, type ReviewKey, type ReviewSummary } from "./types";

type Options = { readonly enabled: boolean; readonly onUnauthorized: () => void };

const SESSION_EXPIRED = "로그인이 만료되었습니다. 다시 로그인해 주세요.";
const errorText = (cause: unknown) => isUnauthorized(cause) ? SESSION_EXPIRED
  : cause instanceof Error ? cause.message : "심사 정보를 불러오지 못했습니다.";

/** 심사 목록과 선택한 심사를 DB 기준으로 읽는다. 늦게 도착한 오래된 응답은 버린다. */
export function usePdfReviews({ enabled, onUnauthorized }: Options) {
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState<ReviewKey | null>(null);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const selected = useRef<ReviewKey | null>(null);
  const listSeq = useRef(0);
  const detailSeq = useRef(0);
  const mounted = useRef(true);
  const unauthorized = useRef(onUnauthorized);
  useEffect(() => { unauthorized.current = onUnauthorized; });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const loadList = useCallback(async () => {
    const seq = ++listSeq.current;
    try {
      const next = await listPdfReviews();
      if (!mounted.current || seq !== listSeq.current) return;
      setReviews(next); setListError("");
    } catch (cause) {
      if (isUnauthorized(cause)) unauthorized.current();
      if (mounted.current && seq === listSeq.current) setListError(errorText(cause));
    } finally { if (mounted.current && seq === listSeq.current) setListLoading(false); }
  }, []);

  const loadDetail = useCallback(async (id: ReviewKey) => {
    const seq = ++detailSeq.current;
    try {
      const next = await fetchPdfReview(id);
      if (!mounted.current || seq !== detailSeq.current) return;
      setDetail(next); setDetailError("");
    } catch (cause) {
      if (isUnauthorized(cause)) unauthorized.current();
      if (mounted.current && seq === detailSeq.current) setDetailError(errorText(cause));
    } finally { if (mounted.current && seq === detailSeq.current) setDetailLoading(false); }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const seq = ++listSeq.current;
    void listPdfReviews().then(next => {
      if (active && seq === listSeq.current) { setReviews(next); setListError(""); }
    }).catch(cause => {
      if (active && isUnauthorized(cause)) unauthorized.current();
      if (active && seq === listSeq.current) setListError(errorText(cause));
    }).finally(() => { if (active && seq === listSeq.current) setListLoading(false); });
    return () => { active = false; };
  }, [enabled]);

  function open(id: ReviewKey) {
    if (sameKey(selected.current, id)) return;
    selected.current = id;
    setSelectedId(id); setDetail(null); setDetailError(""); setDetailLoading(true);
    void loadDetail(id);
  }

  /** 목록과 선택한 심사를 함께 다시 읽는다(요청 2개). SSE 완료 이벤트와 수동 새로고침이 같이 쓴다. */
  const sync = useCallback(async () => {
    await Promise.all([loadList(), selected.current === null ? undefined : loadDetail(selected.current)]);
  }, [loadList, loadDetail]);

  return {
    reviews, listLoading, listError, selectedId, detail, detailLoading, detailError, refreshing,
    open, sync,
    refresh: async () => { setRefreshing(true); try { await sync(); } finally { if (mounted.current) setRefreshing(false); } },
    created: (next: ReviewDetail) => {
      selected.current = next.id; detailSeq.current += 1;
      setSelectedId(next.id); setDetail(next); setDetailError(""); setDetailLoading(false);
      void loadList();
    },
    replaceEntry: (entry: ReviewEntry) => setDetail(current => current && {
      ...current, entries: current.entries.map(item => sameKey(item.id, entry.id) ? entry : item),
    }),
  };
}
