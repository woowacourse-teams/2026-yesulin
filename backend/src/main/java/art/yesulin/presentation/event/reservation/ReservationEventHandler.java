package art.yesulin.presentation.event.reservation;

import art.yesulin.domain.reservation.event.ReservationCanceledEvent;
import art.yesulin.domain.reservation.event.ReservationConfirmedEvent;
import art.yesulin.domain.reservation.event.ReservationTicketCountChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * 커밋된 예매 확정·취소·매수 변경을 운영 로그로 남긴다. 롤백된 예매는 기록하지 않는다.
 * 예매자 이름·휴대폰과 예매번호는 담지 않는다.
 */
@Component
public class ReservationEventHandler {

    static final String CONFIRMED_EVENT = "RESERVATION_CONFIRMED";
    static final String CANCELED_EVENT = "RESERVATION_CANCELED";
    static final String TICKETS_CHANGED_EVENT = "RESERVATION_TICKETS_CHANGED";

    private static final Logger LOGGER = LoggerFactory.getLogger(ReservationEventHandler.class);

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(ReservationConfirmedEvent event) {
        log(CONFIRMED_EVENT, "예매 확정", event.reservationId(), event.sessionId(), event.ticketCount());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(ReservationCanceledEvent event) {
        log(CANCELED_EVENT, "예매 취소", event.reservationId(), event.sessionId(), event.ticketCount());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(ReservationTicketCountChangedEvent event) {
        LOGGER.atInfo()
                .addKeyValue("event", TICKETS_CHANGED_EVENT)
                .addKeyValue("reservationId", event.reservationId())
                .addKeyValue("sessionId", event.sessionId())
                .addKeyValue("previousTicketCount", event.previousTicketCount())
                .addKeyValue("ticketCount", event.ticketCount())
                .log("예매 매수 변경 reservationId={} sessionId={} ticketCount={}->{}", event.reservationId(),
                        event.sessionId(), event.previousTicketCount(), event.ticketCount());
    }

    private void log(String eventName, String action, long reservationId, long sessionId, int ticketCount) {
        LOGGER.atInfo()
                .addKeyValue("event", eventName)
                .addKeyValue("reservationId", reservationId)
                .addKeyValue("sessionId", sessionId)
                .addKeyValue("ticketCount", ticketCount)
                .log("{} reservationId={} sessionId={} ticketCount={}", action, reservationId, sessionId, ticketCount);
    }
}
