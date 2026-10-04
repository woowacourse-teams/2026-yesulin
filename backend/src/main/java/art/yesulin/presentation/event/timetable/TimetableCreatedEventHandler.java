package art.yesulin.presentation.event.timetable;

import art.yesulin.application.timetable.TimetableMessenger;
import art.yesulin.domain.timetable.event.TimetableCreatedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TimetableCreatedEventHandler {

    private final TimetableMessenger messenger;

    // 다른 문자 이벤트와 달리 커밋 뒤가 아니라 일정표와 같은 트랜잭션에서 문자를 저장한다.
    @EventListener
    public void handle(TimetableCreatedEvent event) {
        messenger.sendManageLink(event.timetableId());
    }
}
