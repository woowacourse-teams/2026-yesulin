package art.yesulin.feedback.application;

import art.yesulin.feedback.domain.FeedbackErrorCode;
import art.yesulin.feedback.domain.FeedbackImage;
import art.yesulin.global.exception.BusinessException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRecorder recorder;
    private final FeedbackImageStorage imageStorage;
    private final FeedbackRateLimiter rateLimiter;

    /**
     * 같은 접속 주소의 잦은 전송을 거절하고, 이미지를 먼저 올린 뒤 의견을 저장한다.
     * 저장에 실패하면 올린 이미지를 치운다.
     */
    public long submit(FeedbackSubmission submission, String clientKey) {
        if (!rateLimiter.tryAcquire(clientKey)) {
            throw new BusinessException(FeedbackErrorCode.TOO_FREQUENT, "잠시 후 다시 보내 주세요.");
        }
        List<FeedbackImage> images = imageStorage.store(submission.images());
        try {
            return recorder.record(submission, images);
        } catch (RuntimeException exception) {
            imageStorage.deleteQuietly(images);
            throw exception;
        }
    }
}
