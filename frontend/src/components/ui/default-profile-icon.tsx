export function DefaultProfileIcon({ className = "h-6 w-6" }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-[1.8]`}
      strokeLinecap="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.7-3.8 2.8-5.7 6.5-5.7s5.8 1.9 6.5 5.7" />
    </svg>
  );
}
