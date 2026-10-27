package art.yesulin.community.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.community.domain.CommunityReport;
import art.yesulin.community.domain.CommunityReportRepository;
import art.yesulin.community.domain.ReportReason;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:community-reports;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "yesulin.community.notifications-enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class CommunityReportServiceTest {

    private static final String OWNER = "c".repeat(64);

    @Autowired
    private CommunityService community;

    @Autowired
    private CommunityReportService reports;

    @Autowired
    private CommunityReportRepository repository;

    @Autowired
    private CommunityReportDelivery delivery;

    @MockitoBean
    private CommunityReportNotifier notifier;

    @BeforeEach
    void resetNotifier() {
        reset(notifier);
        when(notifier.enabled()).thenReturn(true);
    }

    @Test
    void duplicateRequestIsStoredOnceWithoutHidingContent() {
        EntryResult post = create();
        UUID request = UUID.randomUUID();
        reports.report(post.id(), OWNER, request, ReportReason.SPAM, "상세 사유");
        reports.report(post.id(), OWNER, request, ReportReason.SPAM, "상세 사유");
        assertEquals(1, repository.findAllByEntryId(post.id()).size());
        assertEquals("본문", community.post(post.id(), null).body());
        assertThrows(BusinessException.class, () ->
                reports.report(post.id(), OWNER, request, ReportReason.OTHER, "다른 사유"));
    }

    @Test
    void simultaneousReportsCreateOnlyOneNotification() throws Exception {
        EntryResult post = create();
        Callable<Void> report = () -> {
            reports.report(post.id(), OWNER, UUID.randomUUID(), ReportReason.SPAM, "");
            return null;
        };
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (java.util.concurrent.Future<Void> result : executor.invokeAll(List.of(report, report, report))) {
                result.get();
            }
        }
        assertEquals(3, repository.findAllByEntryId(post.id()).size());
        long notifications = repository.findAllByEntryId(post.id()).stream()
                .filter(CommunityReport::isNotification).count();
        assertEquals(1, notifications);
    }

    @Test
    void failedDeliveryRemainsRetryableAndSuccessfulDeliveryIsRecorded() {
        long failed = firstReport();
        doThrow(new IllegalStateException("external failure")).when(notifier).send(any());
        delivery.deliver(failed);
        CommunityReport retained = repository.findById(failed).orElseThrow();
        assertNull(retained.getDeliveredAt());
        assertEquals(1, retained.getAttempts());
        assertNotNull(retained.getNextAttemptAt());
        reset(notifier);
        long successful = firstReport();
        delivery.deliver(successful);
        assertNotNull(repository.findById(successful).orElseThrow().getDeliveredAt());
        verify(notifier).send(any());
    }

    @Test
    void deletedTargetsCannotBeReported() {
        EntryResult post = create();
        community.deletePost(post.id(), OWNER);
        assertThrows(BusinessException.class, () ->
                reports.report(post.id(), OWNER, UUID.randomUUID(), ReportReason.SPAM, ""));
    }

    private EntryResult create() {
        return community.createPost(OWNER, UUID.randomUUID(), "제목", "본문");
    }

    private long firstReport() {
        long postId = create().id();
        reports.report(postId, OWNER, UUID.randomUUID(), ReportReason.SPAM, "");
        return repository.findAllByEntryId(postId).getFirst().getId();
    }
}
