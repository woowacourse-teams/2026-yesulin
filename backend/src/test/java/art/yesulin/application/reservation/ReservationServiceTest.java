package art.yesulin.application.reservation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.common.exception.ErrorCode;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.reservation.Reservation;
import art.yesulin.domain.reservation.ReservationErrorCode;
import art.yesulin.domain.reservation.ReservationRepository;
import art.yesulin.domain.reservation.ReservationStatus;
import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowErrorCode;
import art.yesulin.domain.show.ShowRepository;
import art.yesulin.domain.show.ShowSession;
import art.yesulin.domain.show.ShowSessionRepository;
import art.yesulin.presentation.event.reservation.ReservationEventHandler;
import art.yesulin.support.ObjectStorageTestConfiguration;
import art.yesulin.support.ShowTestFixture;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:reservation-service;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, ReservationServiceTest.FixedClockConfiguration.class})
class ReservationServiceTest {

    private static final long OWNER_ID = 1L;
    private static final long OTHER_OWNER_ID = 2L;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private ShowRepository showRepository;

    @Autowired
    private ShowSessionRepository sessionRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    private ShowTestFixture fixture;

    private final Logger eventLogger = (Logger) LoggerFactory.getLogger(ReservationEventHandler.class);
    private final ListAppender<ILoggingEvent> eventLogs = new ListAppender<>();

    @BeforeEach
    void setUp() {
        fixture = new ShowTestFixture(
                showRepository, sessionRepository, reservationRepository, fileAssetRepository, fileReferenceRepository
        );
        fixture.cleanUp();
        eventLogs.start();
        eventLogger.addAppender(eventLogs);
    }

    @AfterEach
    void detachEventLogs() {
        eventLogger.detachAppender(eventLogs);
        eventLogs.stop();
    }

    @Test
    void reservesWithinCapacityAndReturnsReceipt() {
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);

        ReservationReceiptResult receipt = reservationService.reserve(
                show.getPublicId(), session.getId(), command("010-1111-2222", 4)
        );

        assertEquals("햄릿", receipt.showTitle());
        assertEquals(4, receipt.ticketCount());
        assertEquals(ShowTestFixture.STARTS_AT, receipt.startsAt());
        assertEquals(4, reservationRepository.sumTicketCountBySessionIdAndStatus(
                session.getId(), ReservationStatus.CONFIRMED));
    }

    @Test
    void rejectsRequestOverRemainingSeats() {
        Show show = fixture.openShow(OWNER_ID, 5);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-0001", 4));

        assertCode(ShowErrorCode.SESSION_NOT_ENOUGH_SEATS, () -> reservationService.reserve(
                show.getPublicId(), session.getId(), command("010-1111-0002", 2)
        ));
    }

    @Test
    void rejectsSamePhoneInSameSessionUntilCanceled() {
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-2222", 1));

        assertCode(ReservationErrorCode.DUPLICATE, () -> reservationService.reserve(
                show.getPublicId(), session.getId(), command("010-1111-2222", 1)
        ));

        long reservationId = reservationRepository.findAll().getFirst().getId();
        reservationService.cancel(OWNER_ID, reservationId);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-2222", 2));

        assertEquals(2, reservationRepository.sumTicketCountBySessionIdAndStatus(
                session.getId(), ReservationStatus.CONFIRMED));
    }

    @Test
    void hidesDraftShowAndRejectsClosedShow() {
        Show draft = fixture.show(OWNER_ID);
        ShowSession draftSession = fixture.session(draft, 10);
        Show closed = fixture.openShow(OWNER_ID, 10);
        closed.close();
        showRepository.save(closed);

        assertCode(ShowErrorCode.NOT_FOUND, () -> reservationService.reserve(
                draft.getPublicId(), draftSession.getId(), command("010-1111-2222", 1)
        ));
        assertCode(ShowErrorCode.NOT_OPEN, () -> reservationService.reserve(
                closed.getPublicId(), fixture.firstSession(closed).getId(), command("010-1111-2222", 1)
        ));
    }

    @Test
    void rejectsSessionOfAnotherShowAndMissingConsent() {
        Show show = fixture.openShow(OWNER_ID, 10);
        Show other = fixture.openShow(OWNER_ID, 10);

        assertCode(ShowErrorCode.SESSION_NOT_FOUND, () -> reservationService.reserve(
                show.getPublicId(), fixture.firstSession(other).getId(), command("010-1111-2222", 1)
        ));
        assertCode(ReservationErrorCode.INVALID_INPUT, () -> reservationService.reserve(
                show.getPublicId(), fixture.firstSession(show).getId(),
                new ReserveCommand("홍길동", "010-1111-2222", 1, false)
        ));
    }

    @Test
    void onlyOwnerCanListAndCancelReservations() {
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-2222", 2));
        long reservationId = reservationRepository.findAll().getFirst().getId();

        assertCode(ShowErrorCode.NOT_FOUND, () -> reservationService.findSessionReservations(
                OTHER_OWNER_ID, show.getPublicId(), session.getId()
        ));
        assertCode(ReservationErrorCode.NOT_FOUND, () -> reservationService.cancel(OTHER_OWNER_ID, reservationId));

        ProducerReservationResult canceled = reservationService.cancel(OWNER_ID, reservationId);

        assertEquals(ReservationStatus.CANCELED, canceled.status());
        assertEquals("010-1111-2222", reservationService.findSessionReservations(
                OWNER_ID, show.getPublicId(), session.getId()).reservations().getFirst().bookerPhone());
    }

    @Test
    void logsCommittedReservationWithoutBookerDetails() {
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);

        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-2222", 3));

        Reservation reservation = reservationRepository.findAll().getFirst();
        assertEquals(1, eventLogs.list.size());
        ILoggingEvent log = eventLogs.list.getFirst();
        assertEquals(Map.of(
                "event", "RESERVATION_CONFIRMED",
                "reservationId", reservation.getId(),
                "sessionId", session.getId(),
                "ticketCount", 3
        ), keyValues(log));
        assertFalse(log.getFormattedMessage().contains("홍길동"));
        assertFalse(log.getFormattedMessage().contains("010-1111-2222"));
        assertFalse(log.getFormattedMessage().contains(reservation.getCode()));
    }

    @Test
    void rejectedReservationLeavesNoReservationLog() {
        Show show = fixture.openShow(OWNER_ID, 5);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-0001", 4));
        eventLogs.list.clear();

        assertCode(ShowErrorCode.SESSION_NOT_ENOUGH_SEATS, () -> reservationService.reserve(
                show.getPublicId(), session.getId(), command("010-1111-0002", 2)
        ));

        assertEquals(List.of(), eventLogs.list);
    }

    @Test
    void logsCancellationOnlyOnce() {
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-2222", 2));
        long reservationId = reservationRepository.findAll().getFirst().getId();
        eventLogs.list.clear();

        reservationService.cancel(OWNER_ID, reservationId);
        reservationService.cancel(OWNER_ID, reservationId);

        assertEquals(1, eventLogs.list.size());
        assertEquals(Map.of(
                "event", "RESERVATION_CANCELED",
                "reservationId", reservationId,
                "sessionId", session.getId(),
                "ticketCount", 2
        ), keyValues(eventLogs.list.getFirst()));
    }

    @Test
    void changesTicketCountWithinCapacityEvenAfterBookingCloses() {
        Show show = fixture.openShow(OWNER_ID, 6);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-0001", 3));
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-0002", 2));
        long reservationId = reservationRepository.findAll().getFirst().getId();
        show.close();
        showRepository.save(show);

        assertEquals(4, reservationService.changeTicketCount(OWNER_ID, reservationId, 4).ticketCount());
        assertCode(ShowErrorCode.SESSION_NOT_ENOUGH_SEATS,
                () -> reservationService.changeTicketCount(OWNER_ID, reservationId, 5));
        assertEquals(1, reservationService.changeTicketCount(OWNER_ID, reservationId, 1).ticketCount());
        assertEquals(3, reservationRepository.sumTicketCountBySessionIdAndStatus(
                session.getId(), ReservationStatus.CONFIRMED));
    }

    @Test
    void rejectsTicketChangeOfCanceledOrOthersReservation() {
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-2222", 2));
        long reservationId = reservationRepository.findAll().getFirst().getId();

        assertCode(ReservationErrorCode.NOT_FOUND,
                () -> reservationService.changeTicketCount(OTHER_OWNER_ID, reservationId, 3));
        reservationService.cancel(OWNER_ID, reservationId);
        assertCode(ReservationErrorCode.NOT_CHANGEABLE,
                () -> reservationService.changeTicketCount(OWNER_ID, reservationId, 3));
    }

    @Test
    void logsTicketChangeWithoutBookerDetails() {
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-2222", 3));
        long reservationId = reservationRepository.findAll().getFirst().getId();
        eventLogs.list.clear();

        reservationService.changeTicketCount(OWNER_ID, reservationId, 3);
        reservationService.changeTicketCount(OWNER_ID, reservationId, 4);

        assertEquals(1, eventLogs.list.size());
        ILoggingEvent log = eventLogs.list.getFirst();
        assertEquals(Map.of(
                "event", "RESERVATION_TICKETS_CHANGED",
                "reservationId", reservationId,
                "sessionId", session.getId(),
                "previousTicketCount", 3,
                "ticketCount", 4
        ), keyValues(log));
        assertFalse(log.getFormattedMessage().contains("홍길동"));
        assertFalse(log.getFormattedMessage().contains("010-1111-2222"));
    }

    @Test
    void onlyOwnerCanUpdateMemoIncludingCanceledReservation() {
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-1111-2222", 2));
        long reservationId = reservationRepository.findAll().getFirst().getId();

        assertCode(ReservationErrorCode.NOT_FOUND,
                () -> reservationService.updateMemo(OTHER_OWNER_ID, reservationId, "메모"));
        assertEquals("휠체어석 안내", reservationService.updateMemo(OWNER_ID, reservationId, " 휠체어석 안내 ").memo());
        reservationService.cancel(OWNER_ID, reservationId);
        assertEquals("일정 변경으로 취소", reservationService.updateMemo(
                OWNER_ID, reservationId, "일정 변경으로 취소").memo());
        assertEquals("일정 변경으로 취소", reservationService.findSessionReservations(
                OWNER_ID, show.getPublicId(), session.getId()).reservations().getFirst().memo());
    }

    @Test
    void concurrentReservationsNeverExceedCapacity() throws Exception {
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);
        ExecutorService executor = Executors.newFixedThreadPool(6);
        List<Callable<Boolean>> tasks = new ArrayList<>();
        for (int index = 0; index < 6; index++) {
            String phone = "010-2222-%04d".formatted(index);
            tasks.add(() -> {
                try {
                    reservationService.reserve(show.getPublicId(), session.getId(), command(phone, 3));
                    return true;
                } catch (BusinessException exception) {
                    return false;
                }
            });
        }

        long succeeded = 0;
        for (Future<Boolean> result : executor.invokeAll(tasks)) {
            succeeded += result.get() ? 1 : 0;
        }
        executor.shutdown();

        assertEquals(3, succeeded);
        assertEquals(9, reservationRepository.sumTicketCountBySessionIdAndStatus(
                session.getId(), ReservationStatus.CONFIRMED));
    }

    /**
     * 남은 좌석 5석에서 기존 예매 5→8매 변경(3석 필요)과 새 4매 예매가 동시에 들어오면 둘 중 하나만 성공해야 한다.
     * 순서가 매번 달라지도록 여러 번 반복한다.
     */
    @Test
    void concurrentTicketChangeAndNewReservationNeverExceedCapacity() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        for (int round = 0; round < 10; round++) {
            Show show = fixture.openShow(OWNER_ID, 10);
            ShowSession session = fixture.firstSession(show);
            reservationService.reserve(show.getPublicId(), session.getId(), command("010-3333-0000", 5));
            long reservationId = latestReservationId();
            String newPhone = "010-3333-%04d".formatted(round + 1);
            CountDownLatch start = new CountDownLatch(1);
            Future<Boolean> change = executor.submit(() -> attempt(start, () ->
                    reservationService.changeTicketCount(OWNER_ID, reservationId, 8)));
            Future<Boolean> reserve = executor.submit(() -> attempt(start, () ->
                    reservationService.reserve(show.getPublicId(), session.getId(), command(newPhone, 4))));
            start.countDown();

            int succeeded = (change.get() ? 1 : 0) + (reserve.get() ? 1 : 0);

            assertEquals(1, succeeded, "round " + round);
            long reserved = reservationRepository.sumTicketCountBySessionIdAndStatus(
                    session.getId(), ReservationStatus.CONFIRMED);
            assertTrue(reserved <= 10, "round " + round + " reserved " + reserved);
        }
        executor.shutdown();
    }

    @Test
    void concurrentChangesOfSameReservationKeepCapacity() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-4444-0001", 2));
        long reservationId = latestReservationId();
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-4444-0002", 2));
        CountDownLatch start = new CountDownLatch(1);

        Future<Boolean> first = executor.submit(() -> attempt(start, () ->
                reservationService.changeTicketCount(OWNER_ID, reservationId, 8)));
        Future<Boolean> second = executor.submit(() -> attempt(start, () ->
                reservationService.changeTicketCount(OWNER_ID, reservationId, 7)));
        start.countDown();
        first.get();
        second.get();
        executor.shutdown();

        long reserved = reservationRepository.sumTicketCountBySessionIdAndStatus(
                session.getId(), ReservationStatus.CONFIRMED);
        assertTrue(reserved <= 10, "reserved " + reserved);
        int finalCount = reservationRepository.findById(reservationId).orElseThrow().getTicketCount();
        assertTrue(finalCount == 8 || finalCount == 7, "final " + finalCount);
    }

    @Test
    void memoSaveDoesNotReviveCanceledReservation() {
        Show show = fixture.openShow(OWNER_ID, 10);
        ShowSession session = fixture.firstSession(show);
        reservationService.reserve(show.getPublicId(), session.getId(), command("010-5555-0001", 2));
        long reservationId = latestReservationId();

        reservationService.cancel(OWNER_ID, reservationId);
        reservationService.updateMemo(OWNER_ID, reservationId, "취소 후 메모");

        Reservation reloaded = reservationRepository.findById(reservationId).orElseThrow();
        assertEquals(ReservationStatus.CANCELED, reloaded.getStatus());
        assertEquals("취소 후 메모", reloaded.getMemo());
        assertEquals(0, reservationRepository.sumTicketCountBySessionIdAndStatus(
                session.getId(), ReservationStatus.CONFIRMED));
    }

    private long latestReservationId() {
        return reservationRepository.findAll().stream().mapToLong(Reservation::getId).max().orElseThrow();
    }

    private static boolean attempt(CountDownLatch start, Runnable action) throws InterruptedException {
        start.await();
        try {
            action.run();
            return true;
        } catch (BusinessException exception) {
            return false;
        }
    }

    private static ReserveCommand command(String phone, int ticketCount) {
        return new ReserveCommand("홍길동", phone, ticketCount, true);
    }

    private static Map<String, Object> keyValues(ILoggingEvent log) {
        return log.getKeyValuePairs().stream()
                .collect(Collectors.toMap(pair -> pair.key, pair -> pair.value));
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
        Clock fixedReservationClock() {
            return Clock.fixed(ShowTestFixture.NOW, ZoneOffset.UTC);
        }
    }
}
