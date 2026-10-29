package art.yesulin.audit.domain;

public record AuditAnalysis(
        String applicantName,
        String roleId,
        AuditMatchStatus matchStatus,
        String evidence
) {
}
