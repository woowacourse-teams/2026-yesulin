package art.yesulin.timetable.presentation.event;

import art.yesulin.timetable.application.TimetableMessenger;
import art.yesulin.timetable.domain.event.TimetableCreatedEvent;
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
