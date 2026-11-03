export function postUrl(id: number) {
  return `${window.location.origin}/community/${id}`;
}

export async function copyLink(url: string, notify: (message: string) => void) {
  await navigator.clipboard.writeText(url).then(
    () => notify("링크를 복사했어요."),
    () => notify("링크를 복사하지 못했어요. 주소창에서 복사해 주세요."),
  );
}
