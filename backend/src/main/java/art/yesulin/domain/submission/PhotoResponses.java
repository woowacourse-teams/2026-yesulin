package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record PhotoResponses(List<PhotoResponse> values) {

    public static final int MAX_PHOTO_COUNT = 10;

    public PhotoResponses {
        values = requireNonNull(values, "사진 응답 목록은 필수입니다.");
        if (values.size() > MAX_PHOTO_COUNT) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 사진은 최대 10장까지 저장할 수 있습니다.");
        }
        values.forEach(value -> requireNonNull(value, "사진 응답은 비어 있을 수 없습니다."));
        values = List.copyOf(values);
        validateUniqueAssociations(values);
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
}
