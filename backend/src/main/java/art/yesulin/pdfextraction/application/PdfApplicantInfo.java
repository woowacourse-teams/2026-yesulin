package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF_EXTRACTION_RESULT;

import art.yesulin.global.exception.BusinessException;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Set;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

/** PDF 원문에 근거한 AI 지원자 정보. 레거시 콜백과 Spring 후처리에서 함께 사용하며 합불 판단은 담지 않는다. */
public record PdfApplicantInfo(
        String version,
        String status,
        String provider,
        String model,
        String applicantName,
        String applicantNameEvidence,
        String roleId,
        String roleEvidence,
        String reason,
        @JsonInclude(JsonInclude.Include.NON_NULL)
        PdfApplicantProfile profile
) {

    public PdfApplicantInfo(String version, String status, String provider, String model,
                            String applicantName, String applicantNameEvidence, String roleId,
                            String roleEvidence, String reason) {
        this(version, status, provider, model, applicantName, applicantNameEvidence,
                roleId, roleEvidence, reason, null);
    }

    public static final String PROFILE_VERSION = "applicant-info-v2";
    public static final String VERSION = "applicant-info-v1";
    public static final String COMPLETED = "COMPLETED";
    public static final String FAILED = "FAILED";
    public static final String SKIPPED = "SKIPPED";
    public static final int MAX_MODEL_LENGTH = 150;
    public static final int MAX_NAME_LENGTH = 100;
    public static final int MAX_EVIDENCE_LENGTH = 500;

    private static final Set<String> FIELDS = Set.of("version", "status", "provider", "model", "applicantName",
            "applicantNameEvidence", "roleId", "roleEvidence", "reason", "profile");
    private static final Set<String> STATUSES = Set.of(COMPLETED, FAILED, SKIPPED);
    private static final Set<String> PROVIDERS = Set.of("bedrock", "gemini");
    private static final Set<String> REASONS = Set.of(
            "NO_TEXT", "NO_REVIEW", "TEXT_LIMIT_EXCEEDED", "PROVIDER_ERROR", "INVALID_MODEL_OUTPUT");

    /** 배우 프로필 가져오기에서 제안할 이름이나 프로필 값이 하나라도 있는지. */
    public boolean hasProposal() {
        return applicantName != null || (profile != null && profile.hasValue());
    }

    /** 콜백 JSON의 applicantInfo를 검증한다. 필드가 없으면 null이고, 있는데 잘못되면 거부한다. */
    public static PdfApplicantInfo parse(JsonNode node) {
        if (node == null || node.isMissingNode()) {
            return null;
        }
        require(node.isObject(), "AI 지원자 정보가 올바르지 않습니다.");
        node.propertyNames().forEach(name -> require(FIELDS.contains(name), "AI 지원자 정보에 알 수 없는 필드가 있습니다."));
        String status = text(node, "status", 20, true);
        String version = text(node, "version", 40, true);
        require(Set.of(VERSION, PROFILE_VERSION).contains(version) && STATUSES.contains(status),
                "AI 지원자 정보의 버전 또는 상태가 올바르지 않습니다.");
        String provider = text(node, "provider", 20, false);
        String reason = text(node, "reason", 40, false);
        require(provider == null || PROVIDERS.contains(provider), "AI 지원자 정보의 제공자가 올바르지 않습니다.");
        require(reason == null || REASONS.contains(reason), "AI 지원자 정보의 사유가 올바르지 않습니다.");
        final String name = text(node, "applicantName", MAX_NAME_LENGTH, false);
        final String nameEvidence = text(node, "applicantNameEvidence", MAX_EVIDENCE_LENGTH, false);
        String roleId = text(node, "roleId", 36, false);
        final String roleEvidence = text(node, "roleEvidence", MAX_EVIDENCE_LENGTH, false);
        require(roleId == null || isCanonicalUuid(roleId), "AI 지원자 정보의 배역 식별자가 올바르지 않습니다.");
        String model = text(node, "model", MAX_MODEL_LENGTH, false);
        boolean completed = COMPLETED.equals(status);
        require(!completed || (provider != null && model != null), "완료된 AI 지원자 정보에는 제공자와 모델이 필요합니다.");
        require(!completed || reason == null, "완료된 AI 지원자 정보에는 실패·생략 사유를 담을 수 없습니다.");
        require(!FAILED.equals(status) || (provider != null && model != null
                && Set.of("PROVIDER_ERROR", "INVALID_MODEL_OUTPUT").contains(orEmpty(reason))),
                "실패한 AI 지원자 정보의 사유 또는 제공자 정보가 올바르지 않습니다.");
        require(!SKIPPED.equals(status)
                || Set.of("NO_TEXT", "NO_REVIEW", "TEXT_LIMIT_EXCEEDED").contains(orEmpty(reason)),
                "생략한 AI 지원자 정보의 사유가 올바르지 않습니다.");
        require(completed || (name == null && nameEvidence == null && roleId == null && roleEvidence == null),
                "완료되지 않은 AI 지원자 정보에는 이름·배역·근거를 담을 수 없습니다.");
        PdfApplicantProfile profile = PdfApplicantProfile.parse(node.path("profile"));
        require(profile == null || (PROFILE_VERSION.equals(version) && completed),
                "프로필은 완료된 v2 결과에만 담을 수 있습니다.");
        return new PdfApplicantInfo(version, status, orEmpty(provider), orEmpty(model), name, nameEvidence,
                roleId, roleEvidence, orEmpty(reason), profile);
    }

    public boolean completed() {
        return COMPLETED.equals(status);
    }

    private static String text(JsonNode parent, String field, int maxLength, boolean required) {
        JsonNode value = parent.path(field);
        if (value.isMissingNode() || value.isNull()) {
            require(!required, "AI 지원자 정보의 필수 값이 없습니다.");
            return null;
        }
        require(value.isString(), "AI 지원자 정보의 값 형식이 올바르지 않습니다.");
        String raw = value.asText();
        require(raw.codePointCount(0, raw.length()) <= maxLength
                && raw.codePoints().noneMatch(PdfApplicantInfo::isForbiddenControl),
                "AI 지원자 정보의 값이 너무 길거나 허용되지 않는 문자를 포함합니다.");
        if (raw.isBlank()) {
            require(!required, "AI 지원자 정보의 필수 값이 없습니다.");
            return null;
        }
        return raw;
    }

    private static boolean isForbiddenControl(int codePoint) {
        return Character.isISOControl(codePoint) && codePoint != '\n' && codePoint != '\r' && codePoint != '\t';
    }

    private static boolean isCanonicalUuid(String value) {
        try {
            return UUID.fromString(value).toString().equals(value);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static String orEmpty(String value) {
        return value == null ? "" : value;
    }

    private static void require(boolean valid, String message) {
        if (!valid) {
            throw new BusinessException(INVALID_PDF_EXTRACTION_RESULT, message);
        }
    }
}
