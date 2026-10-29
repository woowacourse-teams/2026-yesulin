import type { EventBankAccount } from "./types";

export function eventBankAccountProblem(account: EventBankAccount | null | undefined): string | null {
  if (!account) return null;
  if ([account.bankName, account.accountNumber, account.accountHolder].some(value => typeof value !== "string" || !value.trim())) return "입금 계좌를 안내하려면 은행명·계좌번호·예금주를 모두 입력해 주세요.";
  if (Object.values(account).some(value => value.trim().length > 50)) return "은행명·계좌번호·예금주는 각각 50자 이내로 입력해 주세요.";
  if (!/^[0-9](?:[0-9 -]*[0-9])?$/.test(account.accountNumber.trim())) return "계좌번호는 숫자·하이픈·공백으로 입력해 주세요.";
  return null;
}

/** 은행 앱에 붙여 넣기 쉽도록 계좌번호의 구분자만 제거한다. */
export const accountNumberToCopy = (account: EventBankAccount) => account.accountNumber.replace(/[ -]/g, "");
