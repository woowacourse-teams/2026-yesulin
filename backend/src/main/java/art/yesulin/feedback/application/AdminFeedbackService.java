package art.yesulin.feedback.application;

import art.yesulin.feedback.domain.Feedback;
import art.yesulin.feedback.domain.FeedbackRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 운영자가 받은 의견을 최신순으로 본다. 새 의견이 들어와도 건너뛰지 않게 마지막으로 본 번호보다 작은 의견을 이어 준다.
 * 첨부 이미지는 잠깐 열리는 주소로만 준다.
 */
@Service
@RequiredArgsConstructor
public class AdminFeedbackService {

    static final int PAGE_SIZE = 20;

    private final FeedbackRepository repository;
    private final FeedbackImageStorage imageStorage;

    @Transactional(readOnly = true)
    public AdminFeedbackPage find(long before) {
        Slice<Feedback> feedbacks = repository.findByIdLessThanOrderByIdDesc(before, PageRequest.of(0, PAGE_SIZE));
        List<AdminFeedbackItem> items = feedbacks.stream().map(this::item).toList();
        return new AdminFeedbackPage(items, feedbacks.hasNext());
    }

    private AdminFeedbackItem item(Feedback feedback) {
        List<String> imageUrls = feedback.getImages().stream().map(imageStorage::downloadUrl).toList();
        return AdminFeedbackItem.of(feedback, imageUrls);
    }
}
