package art.yesulin.domain.reservation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.domain.performance.PerformanceVenue;
import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowGenre;
import art.yesulin.domain.show.ShowRepository;
import art.yesulin.domain.show.ShowSession;
import art.yesulin.domain.show.ShowSessionRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:reservation-repository;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class ReservationRepositoryTest {

    private static final Instant STARTS_AT = Instant.parse("2026-10-10T10:00:00Z");

    @Autowired
    private ShowRepository showRepository;

    @Autowired
    private ShowSessionRepository sessionRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Test
    void sumsOnlyConfirmedTicketsBySessionOnFlywaySchema() {
        Show show = showRepository.save(new Show(
                1L, "햄릿", ShowGenre.MUSICAL, "",
                new PerformanceVenue("예술인 소극장", "서울특별시 종로구 대학로 12", "", "", null, null),
                120, "", "02-123-4567", 1L, List.of(2L, 3L)
        ));
        ShowSession first = sessionRepository.save(new ShowSession(show.getId(), STARTS_AT, 30));
        reservationRepository.save(new Reservation(first.getId(), new Booker("가", "010-0000-0001"), 3, "v1"));
        Reservation canceled = reservationRepository.save(
                new Reservation(first.getId(), new Booker("나", "010-0000-0002"), 4, "v1"));
        canceled.cancel(STARTS_AT.minusSeconds(86400));
        reservationRepository.save(canceled);
        ShowSession second = sessionRepository.save(new ShowSession(show.getId(), STARTS_AT.plusSeconds(86400), 30));
        reservationRepository.save(new Reservation(second.getId(), new Booker("다", "010-0000-0003"), 5, "v1"));

        assertEquals(3, reservationRepository.sumTicketCountBySessionIdAndStatus(
                first.getId(), ReservationStatus.CONFIRMED));
        assertEquals(List.of(
                new SessionReservedTickets(first.getId(), 3),
                new SessionReservedTickets(second.getId(), 5)
        ), reservationRepository.sumTicketCountsBySessionIds(
                List.of(first.getId(), second.getId()), ReservationStatus.CONFIRMED).stream()
                .sorted((left, right) -> Long.compare(left.sessionId(), right.sessionId()))
                .toList());
        assertTrue(reservationRepository.existsBySessionIdAndBookerPhoneAndStatus(
                first.getId(), "010-0000-0001", ReservationStatus.CONFIRMED));
        assertFalse(reservationRepository.existsBySessionIdAndBookerPhoneAndStatus(
                first.getId(), "010-0000-0002", ReservationStatus.CONFIRMED));
        assertEquals(List.of(2L, 3L), showRepository.findById(show.getId()).orElseThrow().getImageFileIds());
        assertTrue(showRepository.findByPublicIdAndOwnerId(show.getPublicId(), 1L).isPresent());
        assertTrue(showRepository.findByPublicIdAndOwnerId(show.getPublicId(), 2L).isEmpty());
    }
}
