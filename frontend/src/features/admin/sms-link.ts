const APPLE_DEVICE = /iPhone|iPad|iPod|Macintosh/;

/**
 * 받는 번호와 본문을 채운 채 문자 앱을 여는 `sms:` 링크다. 한 링크에 한 사람만 넣는다. 여러 번호를 넣으면 단체
 * 대화방이 되어 받는 사람끼리 번호가 보인다. Apple 기기는 `&body=`, 그 밖의 기기는 표준인 `?body=`로 본문을 받는다.
 */
export function smsHref(phone: string, body: string, userAgent: string): string {
  const separator = APPLE_DEVICE.test(userAgent) ? "&" : "?";
  return `sms:${phone.replace(/\D/g, "")}${separator}body=${encodeURIComponent(body)}`;
}
