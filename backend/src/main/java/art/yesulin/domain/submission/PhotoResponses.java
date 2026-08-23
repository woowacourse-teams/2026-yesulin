package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PhotoResponses {

    public static final int MAX_PHOTO_COUNT = 10;

    @Column(name = "photo_responses_present", nullable = false, updatable = false)
    private boolean present = true;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "submission_photo_responses", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "response_order")
    private List<PhotoResponse> values = new ArrayList<>();

    public PhotoResponses(List<PhotoResponse> values) {
        List<PhotoResponse> safeValues = requireNonNull(values, "사진 응답 목록은 필수입니다.");
        if (safeValues.size() > MAX_PHOTO_COUNT) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 사진은 최대 10장까지 저장할 수 있습니다.");
        }
        safeValues.forEach(value -> requireNonNull(value, "사진 응답은 비어 있을 수 없습니다."));
        validateUniqueAssociations(safeValues);
        this.values = new ArrayList<>(safeValues);
    }

    private static void validateUniqueAssociations(List<PhotoResponse> values) {
        Set<PhotoAssociation> associations = new HashSet<>();
        if (values.stream().anyMatch(photo -> !associations.add(PhotoAssociation.from(photo)))) {
            throw new BusinessException(INVALID_SUBMISSION, "같은 사진 요구사항에 같은 파일을 중복해서 제출할 수 없습니다.");
        }
    }

    private record PhotoAssociation(long photoRequirementId, long fileId) {

        private static PhotoAssociation from(PhotoResponse photo) {
            return new PhotoAssociation(photo.photoRequirementId(), photo.fileId());
        }
    }

    public List<PhotoResponse> values() {
        return List.copyOf(values);
    }
}
