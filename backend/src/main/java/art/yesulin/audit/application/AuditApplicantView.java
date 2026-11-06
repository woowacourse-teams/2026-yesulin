package art.yesulin.audit.application;

import art.yesulin.audit.domain.AuditApplicant;
import art.yesulin.audit.domain.AuditApplicantStatus;
import art.yesulin.audit.domain.AuditDecision;
import art.yesulin.audit.domain.AuditMatchStatus;

public record AuditApplicantView(
        String id,
        String jobId,
        String originalFilename,
        String applicantName,
        String roleId,
        AuditMatchStatus matchStatus,
        String matchEvidence,
        String memo,
        AuditDecision decision,
        AuditApplicantStatus processingStatus
) {

    public static AuditApplicantView of(AuditApplicant entry) {
        return new AuditApplicantView(entry.getId(), entry.getJobId(), entry.getOriginalFilename(),
                entry.getApplicantName(), entry.getRoleId(), entry.getMatchStatus(), entry.getMatchEvidence(),
                entry.getMemo(), entry.getDecision(), entry.getProcessingStatus());
    }
}
