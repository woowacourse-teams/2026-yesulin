package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record VideoResponses(List<VideoResponse> values) {

    public static final int MAX_VIDEO_COUNT = 5;

    public VideoResponses {
        values = requireNonNull(values, "영상 응답 목록은 필수입니다.");
        if (values.size() > MAX_VIDEO_COUNT) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 영상은 최대 5개까지 저장할 수 있습니다.");
        }
        values.forEach(value -> requireNonNull(value, "영상 응답은 비어 있을 수 없습니다."));
        values = List.copyOf(values);
        validateUniqueRequirementIds(values);
    }

    private static void validateUniqueRequirementIds(List<VideoResponse> values) {
        Set<Long> requirementIds = new HashSet<>();
        if (values.stream().anyMatch(video -> !requirementIds.add(video.videoRequirementId()))) {
            throw new BusinessException(INVALID_SUBMISSION, "같은 영상 요구사항에 여러 URL을 제출할 수 없습니다.");
        }
    }
}
