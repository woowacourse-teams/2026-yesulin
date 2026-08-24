import { safeAuthReturnTo } from "./return-to";

const SOCIAL_LOGIN_RETURN_TO_KEY = "yesulin:social-login:return-to";
const DEFAULT_RETURN_TO = "/applicants";

export function rememberSocialLoginReturnTo(returnTo?: string) {
  if (typeof window === "undefined") return;

  try {
    const safeReturnTo = safeAuthReturnTo(returnTo);
    if (safeReturnTo) {
      window.sessionStorage.setItem(SOCIAL_LOGIN_RETURN_TO_KEY, safeReturnTo);
    } else {
      window.sessionStorage.removeItem(SOCIAL_LOGIN_RETURN_TO_KEY);
    }
  } catch {
    // 저장소를 사용할 수 없어도 소셜 로그인 자체는 계속 진행한다.
  }
}

export function consumeSocialLoginReturnTo() {
  if (typeof window === "undefined") return DEFAULT_RETURN_TO;

  try {
    const storedReturnTo = window.sessionStorage.getItem(SOCIAL_LOGIN_RETURN_TO_KEY) ?? undefined;
    window.sessionStorage.removeItem(SOCIAL_LOGIN_RETURN_TO_KEY);
    return safeAuthReturnTo(storedReturnTo) ?? DEFAULT_RETURN_TO;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}
