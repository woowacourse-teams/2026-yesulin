"use client";

import type { PostHog } from "posthog-js";
import { isAnalyticsEnabled, readAnalyticsConsent } from "./consent";
import {
  environmentMatchesHost, INTERNAL_BROWSER_KEY, isTestObject, PRODUCT_EVENTS, PRODUCT_SETTINGS_EVENT,
  safeProductProperties, type AnalyticsContext, type ProductEvent, type ProductProperties,
} from "./posthog-contract";

let client: PostHog | undefined;
let starting: Promise<boolean> | undefined;
let context: AnalyticsContext | undefined;
let generation = 0;
const pending = new Set<string>();
const VIEW_HISTORY = "yesulin:posthog:visit:v1";
const OPENCHAT_ENTRY = "yesulin:posthog:openchat-entry:v1";

/** 주소 정리·OTR 리디렉션보다 먼저, 해당 공고에 한정한 출처를 잠시 보관한다. */
export function rememberOpenchatEntry(kind: "post" | "otr", id: string) {
  if (!enabled()) return;
  try { sessionStorage.setItem(OPENCHAT_ENTRY, JSON.stringify({ kind, id, at: Date.now() })); } catch { /* optional storage */ }
}

export function isInternalBrowser() {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(INTERNAL_BROWSER_KEY) === "true"; } catch { return false; }
}

export function setInternalBrowser(internal: boolean) {
  try { localStorage.setItem(INTERNAL_BROWSER_KEY, String(internal)); } catch { return false; }
  refreshProductContext();
  window.dispatchEvent(new Event(PRODUCT_SETTINGS_EVENT));
  return true;
}

function enabled() {
  return typeof window !== "undefined" && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)
    && environmentMatchesHost(process.env.NEXT_PUBLIC_POSTHOG_ENV, window.location.hostname)
    && isAnalyticsEnabled(readAnalyticsConsent());
}

/** 분석 거부·로그아웃 시 대기 중인 전송도 중단한다. */
export function resetProductAnalytics() {
  refreshProductContext();
  client?.reset(true);
  client?.opt_out_capturing();
  try { sessionStorage.removeItem(VIEW_HISTORY); } catch { /* optional storage */ }
  try { sessionStorage.removeItem(OPENCHAT_ENTRY); } catch { /* optional storage */ }
}

export function refreshProductContext() {
  generation += 1;
  starting = undefined;
  context = undefined;
  pending.clear();
}

export async function startProductAnalytics() {
  if (!enabled()) return false;
  if (starting) return starting;
  const version = generation;
  starting = (async () => {
    const response = await fetch("/api/analytics/context", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return false;
    const next = await response.json() as AnalyticsContext;
    if (version !== generation || !enabled() || !next.enabled) return false;
    context = next;
    if (!client) {
      const { default: posthog } = await import("posthog-js");
      if (version !== generation || !enabled()) return false;
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
      if (host !== "https://eu.i.posthog.com" && host !== "https://us.i.posthog.com") return false;
      client = posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: host,
        autocapture: false, capture_pageview: false, capture_pageleave: false,
        disable_session_recording: true, disable_surveys: true,
        disable_product_tours: true, disable_conversations: true, capture_performance: false,
        save_campaign_params: false, save_referrer: false,
        capture_exceptions: false, advanced_disable_feature_flags: true,
        persistence: "localStorage", cross_subdomain_cookie: false,
        person_profiles: "identified_only", ip: false,
        before_send: event => {
          if (!event || !enabled() || (!PRODUCT_EVENTS.includes(event.event as ProductEvent) && event.event !== "$identify")) return null;
          const p = event.properties;
          // SDK가 기본으로 붙이는 현재 URL·referrer·페이지 제목은 전달하지 않는다.
          const allowed = new Set(["token", "distinct_id", "$anon_distinct_id", "$device_id", "$session_id", "$window_id", "$lib", "$lib_version", "$geoip_disable",
            "$is_identified", "$process_person_profile", "environment", "internal", "actor", "test_object", "schema_version",
            ...Object.keys(safeProductProperties(p))]);
          event.properties = Object.fromEntries(Object.entries(p).filter(([key]) => allowed.has(key)));
          delete event.$set;
          delete event.$set_once;
          return event;
        },
      });
    }
    if (!client || version !== generation || !enabled()) return false;
    client.opt_in_capturing({ captureEventName: false });
    const identified = client.get_property("$user_id");
    if (identified && identified !== next.identity) client.reset(true);
    // 식별자는 서버 HMAC이다. 이름·이메일·원문 회원 ID를 보내지 않는다.
    if (next.identity) client.identify(next.identity);
    return true;
  })().catch(() => false);
  return starting;
}

export async function trackProductEvent(event: ProductEvent, properties: ProductProperties = {}, onceKey?: string) {
  if (!enabled()) return false;
  if (onceKey && pending.has(onceKey)) return false;
  if (onceKey) pending.add(onceKey);
  const version = generation;
  const ready = await startProductAnalytics();
  if (!ready || !client || !context || version !== generation || !enabled()) {
    if (onceKey) pending.delete(onceKey);
    return false;
  }
  const safe = safeProductProperties(properties);
  client.capture(event, {
    ...safe, environment: process.env.NEXT_PUBLIC_POSTHOG_ENV,
    internal: context.internal || isInternalBrowser(), actor: context.actor,
    test_object: isTestObject(safe, context.testObjects), schema_version: 1,
  });
  return true;
}

type Visit = { at: number; source: "openchat" | "other"; firstPost?: string };
export async function trackPostView(postId: number, viewKey: string, sourceUrl?: string | null) {
  const post_id = String(postId);
  const query = new URLSearchParams(window.location.search);
  let tagged = query.get("utm_source") === "kakao_openchat" || query.get("src") === "kakao_openchat";
  try {
    const entry = JSON.parse(sessionStorage.getItem(OPENCHAT_ENTRY) ?? "null") as { kind: string; id: string; at: number } | null;
    const source = sourceUrl ? new URL(sourceUrl) : null;
    const matches = entry?.kind === "post" ? entry.id === post_id
      : entry?.kind === "otr" && source?.hostname === "otr.co.kr" && source.searchParams.get("vid") === entry.id;
    if (entry && Date.now() - entry.at >= 0 && Date.now() - entry.at < 120_000 && matches) tagged = true;
  } catch { /* 출처를 검증하지 못하면 일반 유입으로 남긴다 */ }
  if (!await startProductAnalytics() || !context) return false;
  let visit: Visit = { at: Date.now(), source: tagged ? "openchat" : "other" };
  try {
    const raw = sessionStorage.getItem(VIEW_HISTORY);
    const stored = raw ? JSON.parse(raw) as Visit : null;
    if (stored && Date.now() - stored.at < 30 * 60_000) visit = { ...stored, at: Date.now() };
  } catch { /* 저장소를 쓸 수 없으면 페이지 간 방문을 연결하지 않는다 */ }
  if (tagged) visit = { at: Date.now(), source: "openchat" };
  const props = { post_id, source: visit.source, has_application_form: Boolean(context.formAttachments[post_id]?.length) };
  const sent = await trackProductEvent("audition_post_viewed", props, `view:${viewKey}`);
  if (!sent) return false;
  if (tagged) {
    await trackProductEvent("openchat_landed", props, `landing:${viewKey}`);
    try { sessionStorage.removeItem(OPENCHAT_ENTRY); } catch { /* optional storage */ }
  }
  if (visit.source === "openchat" && visit.firstPost && visit.firstPost !== post_id) {
    await trackProductEvent("another_post_viewed", props, `explore:${viewKey}`);
  }
  visit.firstPost ??= post_id;
  try { sessionStorage.setItem(VIEW_HISTORY, JSON.stringify(visit)); } catch { /* optional storage */ }
  return true;
}

export async function trackAttachment(postId: number, index: number) {
  if (!await startProductAnalytics() || !context) return;
  const configured = context.formAttachments[String(postId)];
  return trackProductEvent("attachment_download_clicked", {
    post_id: String(postId), attachment_index: index,
    attachment_kind: configured?.includes(index) ? "application_form" : configured ? "reference" : "unknown",
  });
}
