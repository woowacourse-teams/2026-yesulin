"use client";

import { CalendarDateRangeField } from "./calendar-date-range-field";

const selectClass = "min-h-12 min-w-0 rounded-control border border-border bg-card px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft";

export function NoticeAppointmentField({ value, onChange, label }: {
  value: string | null; onChange: (value: string) => void; label: string;
}) {
  const [date = "", time = ""] = (value ?? "").split("T");
  const [hour = "", minute = "00"] = time.split(":");
  return <div role="group" aria-label={label} className="min-w-0 space-y-2">
    <p className="text-sm font-semibold">{label}</p>
    <div className="grid min-w-0 grid-cols-2 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <CalendarDateRangeField single variant="compact" start={date} end="" startLabel={`${label} 날짜`}
          onStartChange={next => onChange(`${next}T${hour}:${minute}`)} onEndChange={() => undefined} />
      </div>
      <select aria-label={`${label} 시`} className={selectClass} value={hour} onChange={e => onChange(`${date}T${e.target.value}:${minute}`)}>
        <option value="" disabled>시</option>
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => <option key={h} value={h}>{h}시</option>)}
      </select>
      <select aria-label={`${label} 분`} className={selectClass} value={minute} onChange={e => onChange(`${date}T${hour}:${e.target.value}`)}>
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map(m => <option key={m} value={m}>{m}분</option>)}
      </select>
    </div>
  </div>;
}
