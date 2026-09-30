package art.yesulin.domain.admin.query;

/**
 * 회원 가입 경로와 기간별 신규 가입 집계다. 개인 식별 정보는 담지 않는다.
 * 배우는 소셜 로그인으로, 기획사·제작사는 이메일로 가입한다. 한 배우가 여러 소셜 계정을 연결하면 경로마다 센다.
 */
public record AdminMemberStats(
        long applicants,
        long producers,
        AdminSignupMethods signupMethods,
        AdminNewMembers today,
        AdminNewMembers lastWeek,
        AdminNewMembers lastMonth
) {
}
