"use client";

export function ReviewDocumentHeading({ title, disabled, onChange, onBlur, onCompositionStart, onCompositionEnd }: {
  readonly title: string; readonly disabled: boolean;
  readonly onChange: (title: string) => void; readonly onBlur: () => void;
  readonly onCompositionStart: () => void; readonly onCompositionEnd: (value: string) => void;
}) {
  return <input aria-label="배우 이름" placeholder="배우 이름을 입력해 주세요" value={title} maxLength={255} disabled={disabled}
    onChange={event => onChange(event.target.value)} onBlur={onBlur}
    onCompositionStart={onCompositionStart} onCompositionEnd={event => onCompositionEnd(event.currentTarget.value)}
    onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.blur(); } }}
    className="min-h-11 min-w-0 w-full flex-1 rounded-lg border border-transparent bg-transparent px-1 text-lg font-bold outline-none transition-colors hover:border-border focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand-soft disabled:opacity-60" />;
}
