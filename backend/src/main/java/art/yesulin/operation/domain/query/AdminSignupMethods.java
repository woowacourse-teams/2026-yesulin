package art.yesulin.operation.domain.query;

/** 가입 경로별 회원 수다. `unknownApplicants`는 연결된 소셜 계정이 없는 배우 수다. */
public record AdminSignupMethods(
        long kakao,
        long naver,
        long google,
        long email,
        long unknownApplicants
) {
}
