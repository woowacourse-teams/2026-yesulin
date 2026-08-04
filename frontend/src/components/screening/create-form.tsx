export const createInputClass =
  "w-full rounded-control border border-border bg-card px-3 py-2.5 text-[13.5px] outline-none transition-colors placeholder:text-muted-soft focus:border-brand";

export function CreatePageButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-control bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-strong"
    >
      {children}
    </button>
  );
}

export function CreateSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border-soft py-5 first:pt-0 last:border-b-0 last:pb-0">
      <div className="mb-3.5">
        <h3 className="text-[14.5px] font-bold">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function CreateField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0" htmlFor={htmlFor}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-muted-strong">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11.5px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function CreateError({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="rounded-control border border-fail-bg bg-fail-bg px-3 py-2 text-[12.5px] text-fail">
      {message}
    </p>
  ) : null;
}
