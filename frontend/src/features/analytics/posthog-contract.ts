/** PostHog에만 쓰는 계약. GA dataLayer에는 식별자를 전달하지 않는다. */
export type ProductProperties = {
  post_id?: string;
  show_id?: string;
  review_id?: string;
  item_id?: string;
  operation_id?: string;
  attachment_index?: number;
  attachment_kind?: "application_form" | "reference" | "unknown";
  has_application_form?: boolean;
  source?: "openchat" | "other";
  workflow?: "actor_pdf" | "producer_pdf" | "standard" | "otr";
  step?: "upload" | "extract" | "apply" | "save";
  outcome?: "success" | "failure";
  error_code?: "upload" | "extract" | "network" | "unknown";
  extraction_status?: string;
  duration_ms?: number;
  active_ms?: number;
  ticket_count?: number;
  capacity?: number;
  reserved_tickets?: number;
  cancelled_count?: number;
  reservation_count?: number;
  session_id?: string;
  eligible?: boolean;
  round?: number;
  total_count?: number;
  completed_count?: number;
  missing_field_count?: number;
};

export const PRODUCT_EVENTS = [
  "audition_post_viewed", "openchat_landed", "another_post_viewed", "attachment_download_clicked",
  "show_viewed", "booking_started", "booking_succeeded", "booking_failed", "external_booking_clicked",
  "producer_post_published", "producer_show_published", "review_saved", "review_item_viewed",
  "review_active_time", "review_progress", "pdf_step_completed", "pdf_step_failed",
  "show_inventory_observed", "booking_inventory_observed",
] as const;
export type ProductEvent = typeof PRODUCT_EVENTS[number];

export const INTERNAL_BROWSER_KEY = "yesulin:analytics-internal:v1";
export const PRODUCT_SETTINGS_EVENT = "yesulin:product-settings";

export type AnalyticsContext = {
  readonly enabled: boolean;
  readonly internal: boolean;
  readonly actor: "anonymous" | "applicant" | "producer" | "admin";
  readonly identity?: string;
  readonly testObjects: readonly string[];
  /** key = 공개 공고 번호, value = 지원 양식 첨부의 0-based index */
  readonly formAttachments: Readonly<Record<string, readonly number[]>>;
};

export function environmentMatchesHost(environment: string | undefined, hostname: string) {
  if (environment === "production") return hostname === "yesulin.art" || hostname === "www.yesulin.art";
  if (environment === "development") return hostname === "dev.yesulin.art" || hostname === "localhost" || hostname === "127.0.0.1";
  return false;
}

const PROPERTY_KEYS = new Set<keyof ProductProperties>([
  "post_id", "show_id", "review_id", "item_id", "operation_id", "attachment_index", "attachment_kind",
  "has_application_form", "source", "workflow", "step", "outcome", "error_code", "duration_ms", "active_ms",
  "extraction_status", "ticket_count", "eligible", "round", "total_count", "completed_count", "missing_field_count",
  "capacity", "reserved_tickets", "cancelled_count", "reservation_count", "session_id",
]);

/** 실행 시에도 허용 키를 제한해 PDF 본문·URL·이름의 혼입을 방지한다. */
export function safeProductProperties(properties: ProductProperties): ProductProperties {
  return Object.fromEntries(Object.entries(properties).filter(([key, value]) => {
    if (!PROPERTY_KEYS.has(key as keyof ProductProperties)) return false;
    if (typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value) && value >= 0;
    if (typeof value !== "string" || value.length > 160) return false;
    return /^[a-zA-Z0-9_:.\-]+$/.test(value);
  }));
}

export function isTestObject(properties: ProductProperties, objects: readonly string[]) {
  return (["post_id", "show_id", "review_id"] as const).some(key =>
    properties[key] !== undefined && objects.includes(`${key}:${properties[key]}`));
}
