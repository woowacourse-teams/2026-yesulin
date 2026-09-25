package art.yesulin.domain.otraudition;

import static art.yesulin.domain.screening.ScreeningReviewErrorCode.INVALID_REVIEW;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "otr_screening_reviews", uniqueConstraints = @UniqueConstraint(
        name = "uk_otr_screening_reviews_submission_role", columnNames = {"otr_submission_id", "role_order"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OtrScreeningReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "otr_audition_id", nullable = false, updatable = false)
    private long otrAuditionId;

    @Column(name = "otr_submission_id", nullable = false, updatable = false)
    private long otrSubmissionId;

    @Column(name = "role_order", nullable = false, updatable = false)
    private int roleOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScreeningReviewStatus status = ScreeningReviewStatus.PENDING;

    @Column(name = "other_reason", nullable = false, length = 255)
    private String otherReason = "";

    @Column(name = "internal_memo", nullable = false, length = 2000)
    private String internalMemo = "";

    public OtrScreeningReview(long otrAuditionId, long otrSubmissionId, int roleOrder) {
        this.otrAuditionId = otrAuditionId;
        this.otrSubmissionId = otrSubmissionId;
        this.roleOrder = roleOrder;
    }

    public void update(ScreeningReviewStatus nextStatus, String memo, String note) {
        if (nextStatus != null) {
            if (nextStatus == ScreeningReviewStatus.ETC) {
                this.otherReason = requiredReason(memo);
            } else if (memo != null) {
                throw new BusinessException(INVALID_REVIEW, "기타 상태에서만 사유를 입력할 수 있습니다.");
            } else {
                this.otherReason = "";
            }
            this.status = nextStatus;
        } else if (memo != null) {
            if (status != ScreeningReviewStatus.ETC) {
                throw new BusinessException(INVALID_REVIEW, "기타 상태에서만 사유를 수정할 수 있습니다.");
            }
            this.otherReason = requiredReason(memo);
        }
        if (note != null) {
            if (note.trim().length() > 2000) {
                throw new BusinessException(INVALID_REVIEW, "내부 심사 메모는 2,000자 이하여야 합니다.");
            }
            this.internalMemo = note.trim();
        }
    }

    private static String requiredReason(String memo) {
        if (memo == null || memo.isBlank() || memo.trim().length() > 255) {
            throw new BusinessException(INVALID_REVIEW, "기타 사유는 1~255자로 입력해 주세요.");
        }
        return memo.trim();
    }
}
