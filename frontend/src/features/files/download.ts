const REVOKE_DELAY_MS = 30_000;

/** 브라우저에서 만든 파일을 내려받게 한다. Safari가 저장을 시작하기 전에 URL이 사라지지 않도록 조금 뒤에 해제한다. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
