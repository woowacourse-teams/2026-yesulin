type Challenge = { code: string; issuedAt: number; failures: number };
type VerificationFailure = { code: string; message: string; status: number };
const challenges = new Map<string, Challenge>();
let nextCode = 123456;

export function issueMockEmailVerification(email: string): VerificationFailure | null {
  const previous = challenges.get(email);
  if (previous && Date.now() < previous.issuedAt + 60_000) {
    return failure("AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON", "인증번호는 발급 후 60초가 지나면 다시 요청할 수 있습니다.", 409);
  }
  challenges.set(email, { code: String(nextCode).padStart(6, "0"), issuedAt: Date.now(), failures: 0 });
  nextCode = (nextCode + 1) % 1_000_000;
  return null;
}

export function verifyMockEmailCode(email: string, code: string): VerificationFailure | null {
  const challenge = challenges.get(email);
  const unavailable = unavailableCode(challenge);
  if (unavailable) return unavailable;
  if (!challenge) return invalidCode();
  if (challenge.code !== code) return recordFailure(challenge);
  challenges.delete(email);
  return null;
}

function unavailableCode(challenge?: Challenge) {
  if (!challenge) return invalidCode();
  if (Date.now() >= challenge.issuedAt + 300_000) {
    return failure("AUTH_EXPIRED_EMAIL_VERIFICATION", "인증번호가 만료됐습니다. 새 인증번호를 요청해 주세요.");
  }
  if (challenge.failures >= 5) return attemptsExceeded();
  return null;
}

function recordFailure(challenge: Challenge) {
  challenge.failures += 1;
  if (challenge.failures >= 5) return attemptsExceeded();
  return invalidCode();
}

function invalidCode() {
  return failure("AUTH_INVALID_EMAIL_VERIFICATION", "인증번호가 일치하지 않습니다. 받은 메일을 확인해 주세요.");
}

function attemptsExceeded() {
  return failure("AUTH_EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED", "인증번호를 5회 잘못 입력했습니다. 새 인증번호를 요청해 주세요.", 409);
}

function failure(code: string, message: string, status = 400): VerificationFailure {
  return { code, message, status };
}
