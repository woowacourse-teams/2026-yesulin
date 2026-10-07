package art.yesulin.application.notice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.domain.notice.Notice;
import art.yesulin.domain.notice.NoticeRepository;
import art.yesulin.domain.notice.NoticeStatus;
import art.yesulin.infrastructure.querydsl.QueryDslConfiguration;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.url=jdbc:h2:mem:notice-sync;MODE=MySQL;DB_CLOSE_DELAY=-1"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(QueryDslConfiguration.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AuditionNoticeServiceTest {

    @Autowired
    private NoticeRepository repository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private final AuditionSource source = mock(AuditionSource.class);
    private final AuditionNoticeNotifier notifier = mock(AuditionNoticeNotifier.class);
    private final AuditionImporter importer = mock(AuditionImporter.class);
    private final OtrNoticeLink noticeLink = new OtrNoticeLink("https://yesulin.art");
    private AuditionNoticeService service;

    @BeforeEach
    void setUp() {
        repository.deleteAllInBatch();
        when(source.getSource()).thenReturn("OTR");
        service = new AuditionNoticeService(source, notifier, repository, transactionManager, importer, noticeLink);
    }

    @Test
    void firstCollectionIsDeliveredAndRestartDoesNotSendAgain() {
        when(source.fetchRecent()).thenReturn(List.of(content("22310")));
        service.notifyAuditions();

        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.SENT);
        verify(notifier).send(List.of(content("22310")));

        when(source.fetchRecent()).thenReturn(List.of(content("22311"), content("22310"), content("22311")));
        AuditionNoticeService restarted =
                new AuditionNoticeService(source, notifier, repository, transactionManager, importer, noticeLink);
        restarted.notifyAuditions();
        restarted.notifyAuditions();

        verify(notifier).send(List.of(content("22311")));
        verify(notifier, times(1)).send(List.of(content("22310")));
        assertThat(repository.count()).isEqualTo(2);
        assertThat(stored("22311").getStatus()).isEqualTo(NoticeStatus.SENT);
        assertThat(stored("22311").getSource()).isEqualTo("OTR");
        assertThat(stored("22311").getExternalId()).isEqualTo("22311");
    }

    @Test
    void importsNewNoticeBeforeNotifying() {
        when(source.fetchRecent()).thenReturn(List.of(content("22330"), content("22333")));
        when(importer.importIfAbsent("OTR", "22330")).thenReturn(Optional.of(7L));
        when(importer.importIfAbsent("OTR", "22333")).thenReturn(Optional.empty());

        service.importAndNotifyAuditions();

        InOrder order = inOrder(importer, notifier);
        order.verify(importer).importIfAbsent("OTR", "22330");
        order.verify(notifier).sendAlerts(List.of(
                new AuditionAlert(content("22330"), "https://yesulin.art/posts/7"),
                new AuditionAlert(content("22333"), "https://yesulin.art/otr?vid=22333")
        ));
    }

    @Test
    void importFailureIsReportedAndNoticeIsStillSent() {
        when(source.fetchRecent()).thenReturn(List.of(content("22331")));
        doThrow(new IllegalStateException("OTR 공고 페이지를 읽지 못했습니다."))
                .when(importer).importIfAbsent("OTR", "22331");

        service.importAndNotifyAuditions();

        verify(notifier).sendError(argThat(message -> message.contains("[OTR-22331] 자동 가져오기 실패")));
        verify(notifier).sendAlerts(List.of(
                new AuditionAlert(content("22331"), "https://yesulin.art/otr?vid=22331")
        ));
        assertThat(stored("22331").getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    @Test
    void notifyOnlyModeDoesNotImport() {
        when(source.fetchRecent()).thenReturn(List.of(content("22332")));

        service.notifyAuditions();

        verify(notifier).send(List.of(content("22332")));
        verify(importer, never()).importIfAbsent(any(), any());
    }

    @Test
    void notifiesOnlyCategoriesWePost() {
        AuditionContent dance = new AuditionContent("22320", "댄스", "댄서 모집", "협의", "상시",
                "https://otr.co.kr/audition/?vid=22320");
        when(source.fetchRecent()).thenReturn(List.of(dance, content("22321")));

        service.notifyAuditions();

        verify(notifier).send(List.of(content("22321")));
        assertThat(repository.existsBySourceAndExternalId("OTR", "22320")).isFalse();
    }

    @Test
    void sendsMultipleNewNoticesInOneBatch() {
        when(source.fetchRecent()).thenReturn(List.of(content("22310"), content("22311")));

        service.notifyAuditions();

        verify(notifier).send(List.of(content("22310"), content("22311")));
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.SENT);
        assertThat(stored("22311").getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    @Test
    void olderPendingNoticeComesFirstAndAlreadySentNoticeIsExcluded() {
        repository.save(Notice.pending("OTR", "100"));
        Notice sent = Notice.pending("OTR", "200");
        sent.markSent();
        repository.save(sent);
        when(source.fetchRecent()).thenReturn(List.of(content("200"), content("300")));
        when(source.fetchById("100")).thenReturn(content("100"));

        service.notifyAuditions();

        verify(notifier).send(List.of(content("100"), content("300")));
        verify(source).fetchById("100");
        verify(source, never()).fetchById("200");
        assertThat(stored("100").getStatus()).isEqualTo(NoticeStatus.SENT);
        assertThat(stored("300").getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    @Test
    void emptyOrFailedFetchDoesNotCreateNotices() {
        when(source.fetchRecent()).thenReturn(List.of()).thenThrow(new IllegalStateException("unavailable"))
                .thenReturn(List.of(content("22310")));

        service.notifyAuditions();
        service.notifyAuditions();
        assertThat(repository.count()).isZero();
        verify(notifier).sendError("[OTR] 공고 목록 조회 실패: unavailable");

        service.notifyAuditions();
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.SENT);
        verify(notifier).send(List.of(content("22310")));
    }

    @Test
    void retriesFailedDeliveryAfterNoticeLeavesRecentPage() {
        when(source.fetchRecent()).thenReturn(List.of(content("22310"), content("22311")))
                .thenReturn(List.of());
        when(source.fetchById("22310")).thenReturn(content("22310"));
        when(source.fetchById("22311")).thenReturn(content("22311"));
        List<AuditionContent> batch = List.of(content("22310"), content("22311"));
        doThrow(new IllegalStateException("failed")).doNothing().when(notifier).send(batch);

        service.notifyAuditions();

        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.PENDING);
        assertThat(stored("22311").getStatus()).isEqualTo(NoticeStatus.PENDING);

        service.notifyAuditions();

        verify(source).fetchById("22310");
        verify(source).fetchById("22311");
        verify(notifier, times(2)).send(batch);
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.SENT);
        assertThat(stored("22311").getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    @Test
    void collectionFailureDoesNotPreventRetryingStoredNotices() {
        repository.saveAndFlush(Notice.pending("OTR", "22310"));
        when(source.fetchRecent()).thenThrow(new IllegalStateException("fetch failed"));
        when(source.fetchById("22310")).thenReturn(content("22310"));

        service.notifyAuditions();

        verify(notifier).sendError("[OTR] 공고 목록 조회 실패: fetch failed");
        verify(notifier).send(List.of(content("22310")));
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    @Test
    void failedDetailFetchLeavesOnlyThatNoticePending() {
        repository.save(Notice.pending("OTR", "22310"));
        repository.save(Notice.pending("OTR", "22311"));
        when(source.fetchRecent()).thenReturn(List.of());
        when(source.fetchById("22310")).thenThrow(new IllegalStateException("detail unavailable"));
        when(source.fetchById("22311")).thenReturn(content("22311"));

        service.notifyAuditions();

        verify(notifier).sendError("[OTR-22310] 공고 상세 조회 실패: detail unavailable");
        verify(notifier).send(List.of(content("22311")));
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.PENDING);
        assertThat(stored("22311").getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    @Test
    void sendsCollectionAndDetailFailuresWithAvailableNotices() {
        repository.save(Notice.pending("OTR", "22310"));
        repository.save(Notice.pending("OTR", "22311"));
        when(source.fetchRecent()).thenThrow(new IllegalStateException("list unavailable"));
        when(source.fetchById("22310")).thenThrow(new IllegalStateException("detail unavailable"));
        when(source.fetchById("22311")).thenReturn(content("22311"));

        service.notifyAuditions();

        verify(notifier).sendError("[OTR] 공고 목록 조회 실패: list unavailable");
        verify(notifier).sendError("[OTR-22310] 공고 상세 조회 실패: detail unavailable");
        verify(notifier).send(List.of(content("22311")));
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.PENDING);
        assertThat(stored("22311").getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    @Test
    void failedCompletionSaveAllowsDuplicateDeliveryOnRetry() {
        Notice pending = repository.saveAndFlush(Notice.pending("OTR", "22310"));
        NoticeRepository failingRepository = mock(NoticeRepository.class);
        when(source.fetchRecent()).thenReturn(List.of());
        when(source.fetchById("22310")).thenReturn(content("22310"));
        when(failingRepository.findAllBySourceAndStatusOrderByIdAsc(
                eq("OTR"), eq(NoticeStatus.PENDING), any())).thenReturn(List.of(pending));
        when(failingRepository.findAllBySourceAndExternalIdIn(eq("OTR"), any()))
                .thenThrow(new IllegalStateException("db failed"));

        AuditionNoticeService failingService = new AuditionNoticeService(
                source, notifier, failingRepository, transactionManager, importer, noticeLink);
        assertThatThrownBy(failingService::notifyAuditions)
                .isInstanceOf(IllegalStateException.class);
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.PENDING);

        service.notifyAuditions();

        verify(notifier, times(2)).send(List.of(content("22310")));
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    @Test
    void sendsPendingNoticesInMessagesOfAtMostFive() {
        for (int index = 1; index <= 41; index++) {
            repository.save(Notice.pending("OTR", Integer.toString(index)));
        }
        when(source.fetchRecent()).thenReturn(List.of());
        when(source.fetchById(any())).thenAnswer(invocation -> {
            String externalId = invocation.getArgument(0);
            return content(externalId);
        });

        service.notifyAuditions();

        assertThat(pending()).isEmpty();
        verify(notifier, times(8)).send(argThat(batch -> batch.size() == 5));
        verify(notifier).send(argThat(batch -> batch.size() == 1));
    }

    @Test
    void failedMessageLeavesOnlyItsBatchPendingAndContinuesWithNextBatch() {
        for (int index = 1; index <= 6; index++) {
            repository.save(Notice.pending("OTR", Integer.toString(index)));
        }
        when(source.fetchRecent()).thenReturn(List.of());
        when(source.fetchById(any())).thenAnswer(invocation -> content(invocation.getArgument(0)));
        List<AuditionContent> firstBatch = IntStream.rangeClosed(1, 5)
                .mapToObj(index -> content(Integer.toString(index))).toList();
        doThrow(new IllegalStateException("failed")).doNothing().when(notifier).send(firstBatch);

        service.notifyAuditions();

        assertThat(pending()).hasSize(5);
        assertThat(stored("6").getStatus()).isEqualTo(NoticeStatus.SENT);
        verify(notifier).send(List.of(content("6")));

        service.notifyAuditions();

        assertThat(pending()).isEmpty();
        verify(notifier, times(2)).send(firstBatch);
    }

    @Test
    void usesSourceProvidedByAuditionSource() {
        when(source.getSource()).thenReturn("OTHER");
        when(source.fetchRecent()).thenReturn(List.of(content("22310")));

        service.notifyAuditions();

        assertThat(repository.findBySourceAndExternalId("OTHER", "22310")).isPresent();
        assertThat(repository.findBySourceAndExternalId("OTHER", "22310").orElseThrow().getStatus())
                .isEqualTo(NoticeStatus.SENT);
        verify(notifier).send(List.of(content("22310")));
    }

    @Test
    void newNoticesRollBackEntireCollectionIfOneInsertFails() {
        AuditionContent oversized = content("x".repeat(101));
        when(source.fetchRecent()).thenReturn(List.of(content("22310"), oversized))
                .thenReturn(List.of(content("22310")));

        assertThatThrownBy(() -> service.notifyAuditions()).isInstanceOf(DataIntegrityViolationException.class);

        assertThat(repository.count()).isZero();
        service.notifyAuditions();
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    @Test
    void databaseRejectsDuplicateSourceAndExternalId() {
        repository.saveAndFlush(Notice.pending("OTR", "22310"));

        assertThatThrownBy(() -> repository.saveAndFlush(Notice.pending("OTR", "22310")))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(repository.count()).isEqualTo(1);
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.PENDING);
    }

    @Test
    void networkCallsRunOutsideDatabaseTransaction() {
        repository.saveAndFlush(Notice.pending("OTR", "22310"));
        when(source.fetchRecent()).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return List.of();
        });
        when(source.fetchById("22310")).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return content("22310");
        });
        doAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return null;
        }).when(notifier).send(List.of(content("22310")));

        service.notifyAuditions();

        verify(notifier).send(List.of(content("22310")));
        assertThat(stored("22310").getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    private Notice stored(String externalId) {
        return repository.findBySourceAndExternalId("OTR", externalId).orElseThrow();
    }

    private List<Notice> pending() {
        return repository.findAllBySourceAndStatusOrderByIdAsc("OTR", NoticeStatus.PENDING,
                PageRequest.of(0, 100));
    }

    private AuditionContent content(String externalId) {
        return new AuditionContent(externalId, "뮤지컬", "배우 모집", "회당 10만원", "2026-09-30",
                "https://otr.co.kr/audition/?vid=" + externalId);
    }
}
