package art.yesulin.domain.common;

public enum DomainError {
    INVALID_EMAIL("INVALID_EMAIL", "이메일 형식이 올바르지 않습니다."),
    INVALID_ID("INVALID_ID", "식별자는 양수여야 합니다."),
    COMPANY_ACCESS_DENIED("COMPANY_ACCESS_DENIED", "해당 공연사에 접근할 권한이 없습니다."),
    TOO_MANY_PROFILE_PHOTOS("TOO_MANY_PROFILE_PHOTOS", "프로필 사진은 최대 10장입니다."),
    INVALID_DRAFT_CONTENT("INVALID_DRAFT_CONTENT", "Draft 내용이 올바르지 않습니다."),
    DRAFT_ALREADY_OWNED("DRAFT_ALREADY_OWNED", "다른 계정에 연결된 Draft입니다."),
    DRAFT_NOT_ACTIVE("DRAFT_NOT_ACTIVE", "활성 Draft만 변경할 수 있습니다."),
    DRAFT_NOT_OWNED("DRAFT_NOT_OWNED", "계정에 연결된 Draft만 제출할 수 있습니다."),
    DRAFT_VERSION_CONFLICT("DRAFT_VERSION_CONFLICT", "더 최신인 Draft가 이미 저장되어 있습니다."),
    APPLICATION_REQUIRED_INFORMATION_MISSING(
            "APPLICATION_REQUIRED_INFORMATION_MISSING", "지원서 필수 정보가 누락되었습니다."),
    APPLICATION_ROLE_INVALID("APPLICATION_ROLE_INVALID", "공고에 속하지 않은 배역입니다."),
    APPLICATION_ROLE_DUPLICATED("APPLICATION_ROLE_DUPLICATED", "같은 배역을 중복 선택할 수 없습니다."),
    APPLICATION_ROLE_REQUIRED("APPLICATION_ROLE_REQUIRED", "배역을 하나 이상 선택해야 합니다."),
    APPLICATION_MULTIPLE_ROLES_NOT_ALLOWED(
            "APPLICATION_MULTIPLE_ROLES_NOT_ALLOWED", "이 공고는 배역을 하나만 선택할 수 있습니다."),
    APPLICATION_CONSENT_REQUIRED("APPLICATION_CONSENT_REQUIRED", "필수 개인정보 동의가 필요합니다."),
    INVALID_SNAPSHOT("INVALID_SNAPSHOT", "제출 스냅샷이 올바르지 않습니다.");

    private final String code;
    private final String message;

    DomainError(String code, String message) {
        this.code = code;
        this.message = message;
    }

    public String code() {
        return code;
    }

    public String message() {
        return message;
    }
}
