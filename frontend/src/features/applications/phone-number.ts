"use client";

import { useLayoutEffect, useEffect, useRef } from "react";
import type { ChangeEvent } from "react";

/** 서버 렌더에서는 layout effect가 경고를 내므로 브라우저에서만 사용한다. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

/**
 * 하이픈을 다시 붙이면 브라우저가 커서를 문자열 끝으로 보낸다.
 * 그래서 010에서 앞자리를 지우려 해도 뒤에서부터 지워졌다.
 * 지운 지점까지의 숫자 개수를 세어 두었다가 React가 값을 바꾼 직후 같은 자리로 되돌린다.
 * 커밋 전에 되돌리면 React가 값을 쓰면서 커서를 다시 끝으로 보내므로 layout effect에서 처리한다.
 */
export function usePhoneInput(format: (value: string) => string) {
  const caretRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const caret = caretRef.current;
    caretRef.current = null;
    if (caret === null) return;
    inputRef.current?.setSelectionRange(caret, caret);
  });

  return (event: ChangeEvent<HTMLInputElement>, apply: (value: string) => void) => {
    const input = event.target;
    const caretIndex = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = digitCount(input.value.slice(0, caretIndex));
    const formatted = format(input.value);
    inputRef.current = input;
    caretRef.current = caretAfterDigits(formatted, digitsBeforeCaret);
    apply(formatted);
  };
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
