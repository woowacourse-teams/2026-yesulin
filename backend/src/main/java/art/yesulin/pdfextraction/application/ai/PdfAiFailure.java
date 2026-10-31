package art.yesulin.pdfextraction.application.ai;

public class PdfAiFailure extends RuntimeException {

    private final String code;
    private final boolean retryable;
    private final String reason;

    public PdfAiFailure(String code, boolean retryable) {
        this(code, retryable, code);
    }

    public PdfAiFailure(String code, boolean retryable, String reason) {
        super(code);
        this.code = code;
        this.retryable = retryable;
        this.reason = reason;
    }

    public String code() {
        return code;
    }

    public boolean retryable() {
        return retryable;
    }

    public String reason() {
        return reason;
    }

    public boolean qualityRejected() {
        return "INVALID_MODEL_OUTPUT".equals(code) && (java.util.Set.of(
                "JSON_SYNTAX", "JSON_OBJECT_BOUNDARY", "JSON_OBJECT_REQUIRED", "UNKNOWN_TOP_LEVEL_FIELD",
                "APPLICANT_OR_PROFILE_SCHEMA", "PROFILE_EVIDENCE_MISMATCH", "APPLICANT_NAME_EVIDENCE_MISMATCH",
                "UNKNOWN_ROLE_ID", "ROLE_EVIDENCE_MISMATCH", "PROFILE_OBJECT_REQUIRED", "CAREERS_ARRAY_OR_LIMIT")
                .contains(reason) || reason.startsWith("INVALID_FIELD_TYPE:"));
    }

    public boolean rateLimited() {
        return "RATE_LIMITED".equals(code);
    }
}
