package art.yesulin.presentation.event.timetable;

import art.yesulin.application.timetable.TimetableMessageRelay;
import art.yesulin.application.timetable.TimetableMessagesQueuedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** 커밋된 일정표 문자만 전달한다. 롤백된 작업의 문자는 대기열에 남지 않으므로 신호도 보내지 않는다. */
@Component
@RequiredArgsConstructor
public class TimetableMessageEventHandler {

    private final TimetableMessageRelay relay;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(TimetableMessagesQueuedEvent event) {
        relay.relay(event);
    }
}
