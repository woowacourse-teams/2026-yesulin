package art.yesulin.audit.domain;

import static art.yesulin.audit.domain.AuditErrorCode.INVALID_PDF_REVIEW;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.DynamicUpdate;

@Entity
@Table(name = "pdf_review_entries")
@DynamicUpdate
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditApplicant {

    public static final int MAX_FILENAME_LENGTH = 255;
    public static final int MAX_APPLICANT_NAME_LENGTH = 100;
    public static final int MAX_EVIDENCE_LENGTH = 1000;
    public static final int MAX_MEMO_LENGTH = 2000;

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, updatable = false, length = 36)
    private String reviewId;

    @Column(nullable = false, updatable = false, length = 36)
    private String jobId;

    @Column(nullable = false, updatable = false, length = MAX_FILENAME_LENGTH)
    private String originalFilename;

    @Column(length = MAX_APPLICANT_NAME_LENGTH)
    private String applicantName;

    @Column(length = 36)
    private String roleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditMatchStatus matchStatus;

    @Column(nullable = false, length = MAX_EVIDENCE_LENGTH)
    private String matchEvidence;

    @Column(nullable = false, length = MAX_MEMO_LENGTH)
    private String memo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditDecision decision;

    @Column(nullable = false)
    private boolean roleManuallyAssigned;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditApplicantStatus processingStatus;

    public AuditApplicant(String reviewId, String jobId, String originalFilename) {
        this.id = UUID.randomUUID().toString();
        this.reviewId = Objects.requireNonNull(reviewId);
        this.jobId = Objects.requireNonNull(jobId);
        this.originalFilename = AuditText.requireName(originalFilename, MAX_FILENAME_LENGTH, "파일 이름");
        this.matchStatus = AuditMatchStatus.WAITING;
        this.matchEvidence = "";
        this.memo = "";
        this.decision = AuditDecision.PENDING;
        this.processingStatus = AuditApplicantStatus.UPLOADING;
    }

    public void applyAnalysis(AuditAnalysis analysis) {
        this.applicantName = analysis.applicantName();
        if (roleManuallyAssigned) {
            return;
        }
        this.roleId = analysis.roleId();
        this.matchStatus = analysis.matchStatus();
        this.matchEvidence = AuditText.abbreviate(analysis.evidence(), MAX_EVIDENCE_LENGTH);
    }

    public void assignRole(String roleId) {
        this.roleId = roleId;
        this.roleManuallyAssigned = true;
        this.matchStatus = roleId == null ? AuditMatchStatus.NEEDS_CHECK : AuditMatchStatus.MATCHED;
        this.matchEvidence = "담당자가 배역을 변경했습니다.";
    }

    public void applyAiAnalysis(AuditAnalysis analysis) {
        if (analysis.applicantName() != null) {
            this.applicantName = analysis.applicantName();
        }
        if (roleManuallyAssigned || (analysis.roleId() == null && this.roleId != null)) {
            return;
        }
        this.roleId = analysis.roleId();
        this.matchStatus = analysis.matchStatus();
        this.matchEvidence = AuditText.abbreviate(analysis.evidence(), MAX_EVIDENCE_LENGTH);
    }

    public void startExtraction() {
        if (processingStatus == AuditApplicantStatus.UPLOADING) {
            this.processingStatus = AuditApplicantStatus.EXTRACTING;
        }
    }

    public void markEnriching() {
        this.processingStatus = AuditApplicantStatus.ENRICHING;
    }

    public void markReady() {
        this.processingStatus = AuditApplicantStatus.READY;
    }

    public void markNeedsReview() {
        this.processingStatus = AuditApplicantStatus.NEEDS_REVIEW;
    }

    public void markFailed() {
        this.processingStatus = AuditApplicantStatus.FAILED;
    }

    public void review(String memo, AuditDecision decision) {
        String value = Objects.requireNonNullElse(memo, "");
        if (decision == null || AuditText.length(value) > MAX_MEMO_LENGTH) {
            throw new BusinessException(INVALID_PDF_REVIEW,
                    "메모는 %d자 이하로 입력하고 판정을 선택해 주세요.", MAX_MEMO_LENGTH);
        }
        this.memo = value;
        this.decision = decision;
    }
}
