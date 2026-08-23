package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_CONSENT;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.converter.SubmissionConsentTypeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "submission_consents", indexes = {
        @Index(
                name = "idx_submission_consents_applicant_agreed_at",
                columnList = "applicant_id, agreed_at"
        )
}, uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_submission_consents_submission_type",
                columnNames = {"submission_id", "consent_type"}
        )
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubmissionConsent {

    public static final int MAX_DOCUMENT_VERSION_LENGTH = 100;
    public static final int MAX_RECIPIENT_NAME_LENGTH = 255;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "submission_id", nullable = false, updatable = false, columnDefinition = "binary(16)")
    private UUID submissionId;

    @Column(name = "applicant_id", nullable = false, updatable = false)
    private long applicantId;

    @Convert(converter = SubmissionConsentTypeConverter.class)
    @Column(name = "consent_type", nullable = false, updatable = false, length = 50)
    private SubmissionConsentType consentType;

    @Column(name = "document_version", nullable = false, updatable = false, length = MAX_DOCUMENT_VERSION_LENGTH)
    private String documentVersion;

    @Column(
            name = "recipient_name_snapshot",
            updatable = false,
            length = MAX_RECIPIENT_NAME_LENGTH
    )
    private String recipientNameSnapshot;

    @Column(name = "agreed_at", nullable = false, updatable = false)
    private Instant agreedAt;

    private SubmissionConsent(
            UUID submissionId,
            long applicantId,
            SubmissionConsentType consentType,
            String documentVersion,
            String recipientNameSnapshot,
            Instant agreedAt
    ) {
        this.submissionId = requireNonNull(submissionId, "동의할 지원서 ID는 필수입니다.");
        this.applicantId = requirePositive(applicantId, "동의 주체 ID는 1 이상이어야 합니다.");
        this.consentType = requireNonNull(consentType, "지원서 동의 유형은 필수입니다.");
        this.documentVersion = normalizeDocumentVersion(documentVersion);
        this.recipientNameSnapshot = recipientNameSnapshot;
        this.agreedAt = requireNonNull(agreedAt, "지원서 동의 시각은 필수입니다.");
    }

    public static SubmissionConsent agreeToPrivacyCollectionAndUse(
            UUID submissionId,
            long applicantId,
            String documentVersion,
            Instant agreedAt
    ) {
        return new SubmissionConsent(
                submissionId,
                applicantId,
                SubmissionConsentType.PRIVACY_COLLECTION_AND_USE,
                documentVersion,
                null,
                agreedAt
        );
    }

    public static SubmissionConsent agreeToThirdPartyProvision(
            UUID submissionId,
            long applicantId,
            String documentVersion,
            String recipientNameSnapshot,
            Instant agreedAt
    ) {
        return new SubmissionConsent(
                submissionId,
                applicantId,
                SubmissionConsentType.THIRD_PARTY_PROVISION,
                documentVersion,
                normalizeRecipientName(recipientNameSnapshot),
                agreedAt
        );
    }

    private static String normalizeDocumentVersion(String documentVersion) {
        String normalizedVersion = requireText(documentVersion, "지원서 동의 문서 버전은 필수입니다.");
        if (normalizedVersion.length() > MAX_DOCUMENT_VERSION_LENGTH) {
            throw new BusinessException(INVALID_CONSENT, "지원서 동의 문서 버전은 100자를 넘을 수 없습니다.");
        }
        return normalizedVersion;
    }

    private static String normalizeRecipientName(String recipientName) {
        String normalizedName = requireText(recipientName, "개인정보를 제공받는 기획사/제작사명은 필수입니다.");
        if (normalizedName.length() > MAX_RECIPIENT_NAME_LENGTH) {
            throw new BusinessException(INVALID_CONSENT, "기획사/제작사명은 255자를 넘을 수 없습니다.");
        }
        return normalizedName;
    }
}
