package art.yesulin.domain.screening;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.screening.ScreeningReviewErrorCode.INVALID_REVIEW;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "screening_reviews", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_screening_reviews_application_role_stage",
                columnNames = {"application_id", "audition_role_id", "screening_stage_id"}
        )
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScreeningReview {

    public static final int MAX_OTHER_REASON_LENGTH = 255;
    public static final int MAX_INTERNAL_MEMO_LENGTH = 2_000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "application_id", nullable = false, updatable = false, columnDefinition = "binary(16)")
    private UUID applicationId;

    @Column(name = "audition_role_id", nullable = false, updatable = false)
    private long auditionRoleId;

    @Column(name = "screening_stage_id", nullable = false, updatable = false)
    private long screeningStageId;

    @Column(nullable = false, length = 20)
    private ScreeningReviewStatus status;

    @Column(name = "other_reason", nullable = false, length = MAX_OTHER_REASON_LENGTH)
    private String otherReason;

    @Column(name = "internal_memo", nullable = false, length = MAX_INTERNAL_MEMO_LENGTH)
    private String internalMemo;

    public ScreeningReview(UUID applicationId, long auditionRoleId, long screeningStageId) {
        this.applicationId = requireNonNull(applicationId, "지원서 ID는 필수입니다.");
        this.auditionRoleId = requirePositive(auditionRoleId, "공고 배역 ID는 1 이상이어야 합니다.");
        this.screeningStageId = requirePositive(screeningStageId, "전형 ID는 1 이상이어야 합니다.");
        this.status = ScreeningReviewStatus.PENDING;
        this.otherReason = "";
        this.internalMemo = "";
    }

    public void decide(ScreeningReviewStatus status, String otherReason) {
        ScreeningReviewStatus nextStatus = requireNonNull(status, "심사 상태는 필수입니다.");
        this.otherReason = resolveOtherReason(nextStatus, otherReason);
        this.status = nextStatus;
    }

    public void apply(ScreeningReviewChange change) {
        requireNonNull(change, "심사 변경 내용은 필수입니다.").applyTo(this);
    }

    public void updateOtherReason(String otherReason) {
        if (status != ScreeningReviewStatus.ETC) {
            throw new BusinessException(INVALID_REVIEW, "기타 상태에서만 사유를 수정할 수 있습니다.");
        }
        this.otherReason = requireOtherReason(otherReason);
    }

    public void updateInternalMemo(String internalMemo) {
        String normalizedMemo = normalizeNullable(internalMemo);
        if (normalizedMemo.length() > MAX_INTERNAL_MEMO_LENGTH) {
            throw new BusinessException(INVALID_REVIEW, "내부 심사 메모는 2,000자 이하여야 합니다.");
        }
        this.internalMemo = normalizedMemo;
    }

    private String requireOtherReason(String otherReason) {
        String normalizedReason = normalizeNullable(otherReason);
        if (normalizedReason.isBlank()) {
            throw new BusinessException(INVALID_REVIEW, "기타 상태의 사유를 입력해 주세요.");
        }
        if (normalizedReason.length() > MAX_OTHER_REASON_LENGTH) {
            throw new BusinessException(INVALID_REVIEW, "기타 사유는 255자 이하여야 합니다.");
        }
        return normalizedReason;
    }

    private String resolveOtherReason(ScreeningReviewStatus status, String otherReason) {
        if (status == ScreeningReviewStatus.ETC) {
            return requireOtherReason(otherReason);
        }
        return "";
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return "";
        }
        return value.trim();
    }
}
