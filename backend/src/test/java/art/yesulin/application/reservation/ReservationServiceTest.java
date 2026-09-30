package art.yesulin.application.reservation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

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
