package art.yesulin.auth.application.memberlink;

import java.time.Instant;

/** 원문 코드는 발급 응답에만 포함하며 로그·감사 기록에 남기지 않는다. */
public record MemberLinkCodeResult(String code, Instant expiresAt, Instant reissueAvailableAt) {

    @Override
    public String toString() {
        return "MemberLinkCodeResult[code=[REDACTED], expiresAt=" + expiresAt + "]";
    }
}
