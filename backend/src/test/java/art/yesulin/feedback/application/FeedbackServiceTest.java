package art.yesulin.feedback.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;

import art.yesulin.feedback.domain.Feedback;
import art.yesulin.feedback.domain.FeedbackErrorCode;
import art.yesulin.feedback.domain.FeedbackImageRules;
import art.yesulin.feedback.domain.FeedbackPage;
import art.yesulin.feedback.domain.FeedbackRepository;
import art.yesulin.feedback.domain.FeedbackType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:feedbacks;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class FeedbackServiceTest {

    @Autowired
    private FeedbackService service;

    @Autowired
    private FeedbackRepository repository;

    @Autowired
    private AdminFeedbackService adminService;

    @Autowired
    private FakeObjectStorage storage;

    @MockitoBean
    private FeedbackNotifier notifier;

    @BeforeEach
    void setUp() {
        reset(notifier);
    }

    @Test
    @DisplayName("의견을 저장하고 커밋 뒤 연락처 원문 없이 알린다")
    void savesAndNotifiesWithoutContactAfterCommit() {
        long id = service.submit(new FeedbackSubmission(FeedbackType.INCONVENIENCE, "버튼이 안 보여요",
                "010-0000-0000", new FeedbackPage("/applicants?tab=1", "UA"), 7L, FeedbackWriter.APPLICANT),
                "10.0.0.1");

        Feedback saved = repository.findById(id).orElseThrow();
        assertEquals("/applicants", saved.getPagePath());
        assertEquals(7L, saved.getMemberId());
        ArgumentCaptor<FeedbackSubmittedEvent> event = ArgumentCaptor.forClass(FeedbackSubmittedEvent.class);
        verify(notifier).notifySubmitted(event.capture());
        assertEquals(id, event.getValue().feedbackId());
        assertTrue(event.getValue().contactLeft());
        assertEquals(FeedbackWriter.APPLICANT, event.getValue().writer());
        assertFalse(event.getValue().toString().contains("010-0000-0000"));
    }

    @Test
    @DisplayName("잘못된 내용이면 저장도 알림도 하지 않는다")
    void rejectsInvalidContentWithoutSavingOrNotifying() {
        long before = repository.count();

        assertThrows(IllegalArgumentException.class, () -> service.submit(new FeedbackSubmission(
                FeedbackType.BUG, " ", "", new FeedbackPage("/", ""), null, FeedbackWriter.GUEST), "10.0.0.2"));

        assertEquals(before, repository.count());
        verify(notifier, never()).notifySubmitted(any());
    }

    @Test
    @DisplayName("같은 접속 주소에서 10분 안에 다섯 번을 넘기면 거절한다")
    void rejectsTooFrequentSubmissionsFromSameClient() {
        for (int count = 0; count < FeedbackRateLimiter.LIMIT; count++) {
            service.submit(submission(), "10.0.0.3");
        }

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.submit(submission(), "10.0.0.3"));

        assertEquals(FeedbackErrorCode.TOO_FREQUENT, exception.getErrorCode());
        service.submit(submission(), "10.0.0.4");
    }

    @Test
    @DisplayName("첨부한 사진을 비공개 경로에 올리고 운영자 목록에서 잠깐 열리는 주소로 보여 준다")
    void storesImagesPrivatelyAndListsThemForAdmin() {
        long id = service.submit(withImages(List.of(jpeg(), png())), "10.0.1.1");

        AdminFeedbackItem item = adminService.find(Long.MAX_VALUE).items().getFirst();
        assertEquals(id, item.id());
        assertEquals(2, item.imageUrls().size());
        assertTrue(item.imageUrls().stream().allMatch(url -> url.contains("private/feedback-images/")));
        ArgumentCaptor<FeedbackSubmittedEvent> event = ArgumentCaptor.forClass(FeedbackSubmittedEvent.class);
        verify(notifier).notifySubmitted(event.capture());
        assertEquals(2, event.getValue().imageCount());
        String key = item.imageUrls().getFirst().replace("https://storage.test/downloads/", "");
        assertEquals("private, no-store", storage.cacheControl(key));
    }

    @Test
    @DisplayName("운영자 목록은 마지막으로 본 번호보다 오래된 의견을 이어 주므로 새 의견이 들어와도 건너뛰지 않는다")
    void listsOlderFeedbackBeforeCursor() {
        long first = service.submit(submission(), "10.0.2.1");
        long second = service.submit(submission(), "10.0.2.2");
        service.submit(submission(), "10.0.2.3");

        AdminFeedbackPage page = adminService.find(second);

        assertEquals(first, page.items().getFirst().id());
    }

    @Test
    @DisplayName("형식이 다르거나 너무 많은 사진은 아무것도 올리거나 저장하지 않고 거절한다")
    void rejectsInvalidImagesWithoutStoringAnything() {
        final long feedbacks = repository.count();
        final int objects = storage.objectCount();
        FeedbackImageFile fakePng = new FeedbackImageFile("image/png", "<html>".getBytes());

        assertInvalidImage(withImages(List.of(jpeg(), fakePng)), "10.0.1.2");
        assertInvalidImage(withImages(List.of(jpeg(), jpeg(), jpeg(), jpeg())), "10.0.1.3");
        assertInvalidImage(withImages(List.of(new FeedbackImageFile("image/gif", jpeg().content()))), "10.0.1.4");
        byte[] large = Arrays.copyOf(jpeg().content(), (int) FeedbackImageRules.MAX_BYTES + 1);
        assertInvalidImage(withImages(List.of(new FeedbackImageFile("image/jpeg", large))), "10.0.1.6");

        assertEquals(feedbacks, repository.count());
        assertEquals(objects, storage.objectCount());
        verify(notifier, never()).notifySubmitted(any());
    }

    @Test
    @DisplayName("의견 저장에 실패하면 먼저 올린 사진을 지운다")
    void deletesUploadedImagesWhenSavingFails() {
        int objects = storage.objectCount();
        FeedbackSubmission blank = new FeedbackSubmission(FeedbackType.BUG, " ", "", new FeedbackPage("/", ""),
                null, FeedbackWriter.GUEST, List.of(jpeg()));

        assertThrows(IllegalArgumentException.class, () -> service.submit(blank, "10.0.1.5"));

        assertEquals(objects, storage.objectCount());
    }

    private void assertInvalidImage(FeedbackSubmission submission, String clientKey) {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.submit(submission, clientKey));
        assertEquals(FeedbackErrorCode.INVALID_IMAGE, exception.getErrorCode());
    }

    private FeedbackSubmission withImages(List<FeedbackImageFile> images) {
        return new FeedbackSubmission(FeedbackType.BUG, "화면이 깨져요", "", new FeedbackPage("/", ""), null,
                FeedbackWriter.GUEST, images);
    }

    private static FeedbackImageFile jpeg() {
        return new FeedbackImageFile("image/jpeg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x01});
    }

    private static FeedbackImageFile png() {
        return new FeedbackImageFile("image/png", new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
    }

    private FeedbackSubmission submission() {
        return new FeedbackSubmission(FeedbackType.SUGGESTION, "제안", "", new FeedbackPage("/", ""), null,
                FeedbackWriter.GUEST);
    }
}
