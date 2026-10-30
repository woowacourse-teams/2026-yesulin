export const adminEventRoutes = {
  list: "/admin/events",
  detail: (eventId: number | string) => `/admin/events/${encodeURIComponent(String(eventId))}`,
  settings: (eventId: number | string) => `/admin/events/${encodeURIComponent(String(eventId))}?tab=settings`,
  history: (eventId: number | string) => `/admin/events/${encodeURIComponent(String(eventId))}?tab=history`,
} as const;
