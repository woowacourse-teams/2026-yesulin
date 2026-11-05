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
import art.yesulin.feedback.domain.FeedbackPage;
import art.yesulin.feedback.domain.FeedbackRepository;
import art.yesulin.feedback.domain.FeedbackType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.ObjectStorageTestConfiguration;
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

    private FeedbackSubmission submission() {
        return new FeedbackSubmission(FeedbackType.SUGGESTION, "제안", "", new FeedbackPage("/", ""), null,
                FeedbackWriter.GUEST);
    }
}
