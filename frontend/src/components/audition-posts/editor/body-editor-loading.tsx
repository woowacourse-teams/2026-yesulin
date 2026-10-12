/** 편집기 코드를 불러오는 동안 같은 높이로 자리를 잡아 화면이 흔들리지 않게 한다. */
export function BodyEditorLoading() {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-control border border-border bg-card text-sm text-muted" role="status">
      편집기를 불러오는 중이에요.
    </div>
  );
}
