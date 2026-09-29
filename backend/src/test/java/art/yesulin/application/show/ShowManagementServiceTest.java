package art.yesulin.application.show;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.performance.PerformanceVenueCommand;
import art.yesulin.application.reservation.ReservationService;
import art.yesulin.application.reservation.ReserveCommand;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.common.exception.ErrorCode;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileErrorCode;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.reservation.Booker;
import art.yesulin.domain.reservation.Reservation;
import art.yesulin.domain.reservation.ReservationRepository;
import art.yesulin.domain.show.ShowErrorCode;
import art.yesulin.domain.show.ShowGenre;
import art.yesulin.domain.show.ShowRepository;
import art.yesulin.domain.show.ShowSessionRepository;
import art.yesulin.domain.show.ShowStatus;
import art.yesulin.support.ObjectStorageTestConfiguration;
import art.yesulin.support.ShowTestFixture;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:show-management;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, ShowManagementServiceTest.FixedClockConfiguration.class})
class ShowManagementServiceTest {

    private static final long OWNER_ID = 1L;
    private static final long OTHER_OWNER_ID = 2L;

    @Autowired
    private ShowManagementService showManagementService;

    @Autowired
    private PublicShowService publicShowService;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private ShowRepository showRepository;

    @Autowired
    private ShowSessionRepository sessionRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private ShowTestFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = new ShowTestFixture(
                showRepository, sessionRepository, reservationRepository, fileAssetRepository, fileReferenceRepository
        );
        fixture.cleanUp();
    }

    @Test
    void createsDraftShowAndLinksPosterAndImages() {
        long posterFileId = fixture.readyImage(OWNER_ID);
        long imageFileId = fixture.readyImage(OWNER_ID);

        ProducerShowResult result = showManagementService.create(OWNER_ID, command(posterFileId, List.of(imageFileId)));

        assertEquals(ShowStatus.DRAFT, result.status());
        assertEquals(ShowGenre.MUSICAL, result.genre());
        assertEquals(List.of(imageFileId), result.imageFileIds());
        long showId = showRepository.findByPublicId(result.id()).orElseThrow().getId();
        assertTrue(fileReferenceRepository.existsByReferenceTypeAndReferenceIdAndFileId(
                "SHOW_POSTER", showId, posterFileId));
        assertTrue(fileReferenceRepository.existsByReferenceTypeAndReferenceIdAndFileId(
                "SHOW_IMAGE", showId, imageFileId));
    }

    @Test
    void rejectsFilesUploadedByAnotherProducer() {
        long othersPoster = fixture.readyImage(OTHER_OWNER_ID);

        assertCode(FileErrorCode.NOT_FOUND, () -> showManagementService.create(
                OWNER_ID, command(othersPoster, List.of())
        ));
    }

    @Test
    void hidesShowsOfOtherProducers() {
        ProducerShowResult result = create();

        assertEquals(1, showManagementService.findAll(OWNER_ID).size());
        assertTrue(showManagementService.findAll(OTHER_OWNER_ID).isEmpty());
        assertCode(ShowErrorCode.NOT_FOUND, () -> showManagementService.find(OTHER_OWNER_ID, result.id()));
        assertCode(ShowErrorCode.NOT_FOUND, () -> showManagementService.open(OTHER_OWNER_ID, result.id()));
    }

    @Test
    void opensOnlyWithFutureSessionAndShowsItPublicly() {
        UUID showId = create().id();

        assertCode(ShowErrorCode.NOT_OPENABLE, () -> showManagementService.open(OWNER_ID, showId));
        assertCode(ShowErrorCode.INVALID_INPUT, () -> showManagementService.addSession(
                OWNER_ID, showId, new SaveShowSessionCommand(ShowTestFixture.NOW, 10)
        ));
        showManagementService.addSession(OWNER_ID, showId, new SaveShowSessionCommand(ShowTestFixture.STARTS_AT, 10));
        showManagementService.open(OWNER_ID, showId);

        PublicShowResult publicShow = publicShowService.find(showId);
        assertEquals(1, publicShowService.findOpenShows().size());
        assertEquals(10L, publicShow.sessions().getFirst().remainingSeats());
        assertEquals(10, publicShow.sessions().getFirst().maxTicketCount());
        assertTrue(publicShow.sessions().getFirst().bookable());
    }

    @Test
    void savesAudienceGuideAndHidesRemainingSeatsOnlyFromAudience() {
        SaveShowCommand hidden = command(fixture.readyImage(OWNER_ID), List.of(), List.of(
                new ShowLinkCommand("공연사 인스타그램 보기", "https://instagram.com/yesulin"),
                new ShowLinkCommand("홈페이지", "http://yesulin.art/about")
        ), "  혜화역 2번 출구에서 도보 5분  ", false);
        UUID showId = showManagementService.create(OWNER_ID, hidden).id();
        long sessionId = showManagementService.addSession(
                OWNER_ID, showId, new SaveShowSessionCommand(ShowTestFixture.STARTS_AT, 8)
        ).sessions().getFirst().id();
        showManagementService.open(OWNER_ID, showId);
        reservationService.reserve(showId, sessionId, new ReserveCommand("홍길동", "010-1111-2222", 3, true));

        ProducerShowResult producerShow = showManagementService.find(OWNER_ID, showId);
        PublicShowResult publicShow = publicShowService.find(showId);

        assertFalse(producerShow.remainingSeatsVisible());
        assertEquals("혜화역 2번 출구에서 도보 5분", producerShow.directionsNote());
        assertEquals(List.of(
                new ShowLinkResult("공연사 인스타그램 보기", "https://instagram.com/yesulin"),
                new ShowLinkResult("홈페이지", "http://yesulin.art/about")
        ), publicShow.links());
        assertEquals("혜화역 2번 출구에서 도보 5분", publicShow.directionsNote());
        assertEquals(3, producerShow.sessions().getFirst().reservedTickets());
        assertNull(publicShow.sessions().getFirst().remainingSeats());
        assertEquals(5, publicShow.sessions().getFirst().maxTicketCount());
        assertTrue(publicShow.sessions().getFirst().bookable());

        showManagementService.update(OWNER_ID, showId, command(producerShow.posterFileId(), List.of()));

        PublicShowResult visible = publicShowService.find(showId);
        assertEquals(5L, visible.sessions().getFirst().remainingSeats());
        assertTrue(visible.links().isEmpty());
        assertEquals("", visible.directionsNote());
    }

    @Test
    void rejectsInvalidAudienceGuideLinks() {
        long posterFileId = fixture.readyImage(OWNER_ID);

        assertCode(ShowErrorCode.INVALID_INPUT, () -> showManagementService.create(OWNER_ID, command(
                posterFileId, List.of(), List.of(new ShowLinkCommand("인스타그램", "instagram.com/yesulin")), "", true
        )));
        assertCode(ShowErrorCode.INVALID_INPUT, () -> showManagementService.create(OWNER_ID, command(
                posterFileId, List.of(), List.of(
                        new ShowLinkCommand("1", "https://a.example"),
                        new ShowLinkCommand("2", "https://b.example"),
                        new ShowLinkCommand("3", "https://c.example"),
                        new ShowLinkCommand("4", "https://d.example")
                ), "", true
        )));
    }

    @Test
    void protectsSessionsAndShowsWithReservations() {
        UUID showId = create().id();
        ProducerShowResult withSession = showManagementService.addSession(
                OWNER_ID, showId, new SaveShowSessionCommand(ShowTestFixture.STARTS_AT, 10)
        );
        long sessionId = withSession.sessions().getFirst().id();
        showManagementService.open(OWNER_ID, showId);
        reservationService.reserve(showId, sessionId, new ReserveCommand("홍길동", "010-1111-2222", 6, true));

        assertCode(ShowErrorCode.SESSION_CAPACITY_BELOW_RESERVED, () -> showManagementService.updateSession(
                OWNER_ID, showId, sessionId, new SaveShowSessionCommand(ShowTestFixture.STARTS_AT, 5)
        ));
        assertCode(ShowErrorCode.SESSION_HAS_RESERVATIONS, () -> showManagementService.deleteSession(
                OWNER_ID, showId, sessionId
        ));
        assertCode(ShowErrorCode.HAS_RESERVATIONS, () -> showManagementService.delete(OWNER_ID, showId));

        ProducerShowResult updated = showManagementService.updateSession(
                OWNER_ID, showId, sessionId, new SaveShowSessionCommand(ShowTestFixture.STARTS_AT, 6)
        );
        assertEquals(6, updated.sessions().getFirst().reservedTickets());
        assertTrue(updated.hasReservations());
        assertFalse(publicShowService.find(showId).sessions().getFirst().bookable());
    }

    @Test
    void deletesShowWithoutReservations() {
        UUID showId = create().id();
        showManagementService.addSession(OWNER_ID, showId, new SaveShowSessionCommand(ShowTestFixture.STARTS_AT, 10));

        showManagementService.delete(OWNER_ID, showId);

        assertTrue(showRepository.findByPublicId(showId).isEmpty());
        assertTrue(sessionRepository.findAll().isEmpty());
        assertTrue(fileReferenceRepository.findAll().isEmpty());
    }

    @Test
    void waitsForReservationInProgressBeforeDeletingShow() throws Exception {
        UUID showId = create().id();
        long sessionId = showManagementService.addSession(
                OWNER_ID, showId, new SaveShowSessionCommand(ShowTestFixture.STARTS_AT, 10)
        ).sessions().getFirst().id();
        showManagementService.open(OWNER_ID, showId);
        CountDownLatch sessionLocked = new CountDownLatch(1);
        CountDownLatch reservationReleased = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);

        final Future<?> reservation = executor.submit(() -> transaction.executeWithoutResult(status -> {
            sessionRepository.findByIdForUpdate(sessionId).orElseThrow();
            reservationRepository.saveAndFlush(new Reservation(
                    sessionId, new Booker("홍길동", "010-1111-2222"), 2, "test-privacy"
            ));
            sessionLocked.countDown();
            awaitQuietly(reservationReleased);
        }));
        assertTrue(sessionLocked.await(5, TimeUnit.SECONDS));
        Future<?> deletion = executor.submit(() -> showManagementService.delete(OWNER_ID, showId));

        assertThrows(TimeoutException.class, () -> deletion.get(500, TimeUnit.MILLISECONDS));
        reservationReleased.countDown();
        reservation.get(5, TimeUnit.SECONDS);
        ExecutionException exception = assertThrows(
                ExecutionException.class, () -> deletion.get(5, TimeUnit.SECONDS)
        );
        executor.shutdown();

        BusinessException cause = assertInstanceOf(BusinessException.class, exception.getCause());
        assertEquals(ShowErrorCode.HAS_RESERVATIONS, cause.getErrorCode());
        assertTrue(showRepository.findByPublicId(showId).isPresent());
    }

    private static void awaitQuietly(CountDownLatch latch) {
        try {
            assertTrue(latch.await(5, TimeUnit.SECONDS));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private ProducerShowResult create() {
        return showManagementService.create(OWNER_ID, command(fixture.readyImage(OWNER_ID), List.of()));
    }

    private static SaveShowCommand command(long posterFileId, List<Long> imageFileIds) {
        return command(posterFileId, imageFileIds, List.of(), "", true);
    }

    private static SaveShowCommand command(
            long posterFileId,
            List<Long> imageFileIds,
            List<ShowLinkCommand> links,
            String directionsNote,
            boolean remainingSeatsVisible
    ) {
        return new SaveShowCommand(
                "달빛 아래 소극장",
                ShowGenre.MUSICAL,
                "무료 창작 뮤지컬",
                new PerformanceVenueCommand("예술인 소극장", "서울특별시 종로구 대학로 12", "", "", null, null),
                100,
                "8세 이상",
                "02-123-4567",
                posterFileId,
                imageFileIds,
                links,
                directionsNote,
                remainingSeatsVisible
        );
    }

    private static void assertCode(ErrorCode expected, Executable executable) {
        BusinessException exception = assertThrows(BusinessException.class, executable::execute);
        assertEquals(expected, exception.getErrorCode());
    }

    @FunctionalInterface
    private interface Executable {
        void execute();
    }

    @TestConfiguration
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock fixedShowManagementClock() {
            return Clock.fixed(ShowTestFixture.NOW, ZoneOffset.UTC);
        }
    }
}
