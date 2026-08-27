export function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

/**
 * 하이픈을 다시 붙이면 브라우저가 커서를 문자열 끝으로 보낸다.
 * 그래서 010에서 앞자리를 지우려 해도 뒤에서부터 지워졌다.
 * 지운 지점까지의 숫자 개수를 세어 같은 자리에 커서를 되돌린다.
 */
export function applyPhoneInput(
  input: HTMLInputElement,
  format: (value: string) => string,
  apply: (value: string) => void,
) {
  const caretIndex = input.selectionStart ?? input.value.length;
  const digitsBeforeCaret = digitCount(input.value.slice(0, caretIndex));
  const formatted = format(input.value);
  apply(formatted);
  const caret = caretAfterDigits(formatted, digitsBeforeCaret);
  requestAnimationFrame(() => {
    if (input.isConnected) input.setSelectionRange(caret, caret);
  });
}

function digitCount(value: string) {
  return value.replace(/\D/g, "").length;
}

function caretAfterDigits(formatted: string, digits: number) {
  if (digits <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (!/\d/.test(formatted[index]!)) continue;
    seen += 1;
    if (seen === digits) return index + 1;
  }
  return formatted.length;
}
