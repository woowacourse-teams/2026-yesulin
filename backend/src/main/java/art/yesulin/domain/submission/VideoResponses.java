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
public class VideoResponses {

    public static final int MAX_VIDEO_COUNT = 5;

    @Column(name = "video_responses_present", nullable = false, updatable = false)
    private boolean present = true;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "submission_video_responses", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "response_order")
    private List<VideoResponse> values = new ArrayList<>();

    public VideoResponses(List<VideoResponse> values) {
        List<VideoResponse> safeValues = requireNonNull(values, "영상 응답 목록은 필수입니다.");
        if (safeValues.size() > MAX_VIDEO_COUNT) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 영상은 최대 5개까지 저장할 수 있습니다.");
        }
        safeValues.forEach(value -> requireNonNull(value, "영상 응답은 비어 있을 수 없습니다."));
        validateUniqueRequirementIds(safeValues);
        this.values = new ArrayList<>(safeValues);
    }

    private static void validateUniqueRequirementIds(List<VideoResponse> values) {
        Set<Long> requirementIds = new HashSet<>();
        if (values.stream().anyMatch(video -> !requirementIds.add(video.videoRequirementId()))) {
            throw new BusinessException(INVALID_SUBMISSION, "같은 영상 요구사항에 여러 URL을 제출할 수 없습니다.");
        }
    }

    public List<VideoResponse> values() {
        return List.copyOf(values);
    }
}
