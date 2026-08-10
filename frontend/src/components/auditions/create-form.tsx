import { PrimaryButton } from "./ui-controls";

export function CreatePageButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <PrimaryButton onClick={onClick} className="shrink-0">
      {children}
    </PrimaryButton>
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
    <section className="border-b border-border-soft py-8 first:pt-0 last:border-b-0 last:pb-0">
      <div className="mb-4">
        <h3 className="text-lg font-bold tracking-[-0.01em]">{title}</h3>
        {description ? <p className="mt-1 text-base leading-relaxed text-muted-strong md:text-sm">{description}</p> : null}
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
      <span className="mb-2 block text-base font-semibold text-muted-strong md:text-sm">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-base leading-relaxed text-muted md:text-sm">{hint}</span> : null}
    </label>
  );
}

export function CreateError({ id, message }: { id?: string; message: string }) {
  return message ? (
    <p
      id={id}
      role="alert"
      className="rounded-control border border-fail-bg bg-fail-bg px-3 py-2 text-sm text-fail"
    >
      {message}
    </p>
  ) : null;
}
