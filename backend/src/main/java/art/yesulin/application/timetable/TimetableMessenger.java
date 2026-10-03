package art.yesulin.application.timetable;

import art.yesulin.domain.timetable.Timetable;
import art.yesulin.domain.timetable.TimetableActor;
import art.yesulin.domain.timetable.TimetableMessage;
import art.yesulin.domain.timetable.TimetableMessageRepository;
import art.yesulin.domain.timetable.TimetableMessageStatus;
import art.yesulin.domain.timetable.TimetableMessageType;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/**
 * 일정표 문자를 만들고 대기열에 넣는다. 받는 사람이 링크에서 항상 최신 일정을 보므로, 아직 보내지 않은 같은 목적의
 * 문자가 있으면 더 쌓지 않는다. 한 작업에서 만든 문자는 한 번에 넣고 운영자 신호도 한 번만 보낸다.
 */
@Component
@RequiredArgsConstructor
public class TimetableMessenger {

    private static final String GREETING = "안녕하세요 예술인입니다.";
    private static final List<TimetableMessageType> ACTOR_NOTICE_TYPES = List.of(
            TimetableMessageType.ACTOR_INVITATION,
            TimetableMessageType.ACTOR_SCHEDULE_CHANGED
    );

    private final TimetableMessageRepository messageRepository;
    private final TimetableLinks links;
    private final ApplicationEventPublisher eventPublisher;

    public TimetableMessage organizerLink(Timetable timetable) {
        String body = """
                %s ‘%s’ 오디션 일정표를 만들었습니다.
                아래 관리 링크에서 배우 등록과 일정 확정을 할 수 있습니다. \
                링크를 가진 사람은 누구나 일정표를 고칠 수 있으니 외부에 공유하지 마세요.
                %s""".formatted(GREETING, timetable.getTitle(), links.manage(timetable.getManageKey()));
        return toOrganizer(timetable, TimetableMessageType.ORGANIZER_LINK, body);
    }

    public TimetableMessage invitation(Timetable timetable, TimetableActor actor) {
        String body = """
                %s %s 오디션 합격입니다. 해당 링크에서 일정을 확인하세요.
                %s""".formatted(GREETING, timetable.getOrganizerName(), links.actor(actor.getAccessKey()));
        return toActor(timetable, actor, TimetableMessageType.ACTOR_INVITATION, body);
    }

    /** 아직 보내지 않은 안내나 변경 문자가 있으면 그 링크로 최신 일정을 보므로 만들지 않는다. */
    public Optional<TimetableMessage> scheduleChange(Timetable timetable, TimetableActor actor) {
        if (messageRepository.existsByActorIdAndStatusAndTypeIn(
                actor.getId(), TimetableMessageStatus.PENDING, ACTOR_NOTICE_TYPES)) {
            return Optional.empty();
        }
        String body = """
                %s %s 오디션 일정이 변경되었습니다. 해당 링크에서 바뀐 일정을 확인하세요.
                %s""".formatted(GREETING, timetable.getOrganizerName(), links.actor(actor.getAccessKey()));
        return Optional.of(toActor(timetable, actor, TimetableMessageType.ACTOR_SCHEDULE_CHANGED, body));
    }

    /** 요청마다 보내지 않고, 아직 보내지 않은 요청 알림이 있으면 그 알림 하나로 묶는다. */
    public Optional<TimetableMessage> timeRequest(Timetable timetable) {
        if (messageRepository.existsByTimetableIdAndStatusAndType(
                timetable.getId(), TimetableMessageStatus.PENDING, TimetableMessageType.ORGANIZER_TIME_REQUEST)) {
            return Optional.empty();
        }
        String body = """
                %s ‘%s’ 일정표에 배우의 시간 조정 요청이 있습니다. 관리 링크에서 확인해 주세요.
                %s""".formatted(GREETING, timetable.getTitle(), links.manage(timetable.getManageKey()));
        return Optional.of(toOrganizer(timetable, TimetableMessageType.ORGANIZER_TIME_REQUEST, body));
    }

    public void queue(Timetable timetable, List<TimetableMessage> messages) {
        if (messages.isEmpty()) {
            return;
        }
        messageRepository.saveAll(messages);
        eventPublisher.publishEvent(new TimetableMessagesQueuedEvent(
                timetable.getId(), timetable.getTitle(), messages.size()
        ));
    }

    /** 명단에서 뺀 배우에게 아직 보내지 않은 문자는 보내지 않는다. 이미 보낸 기록은 남긴다. */
    public void discardPending(TimetableActor actor) {
        messageRepository.deleteAllByActorIdAndStatus(actor.getId(), TimetableMessageStatus.PENDING);
    }

    private TimetableMessage toOrganizer(Timetable timetable, TimetableMessageType type, String body) {
        return new TimetableMessage(
                timetable.getId(), null, type, timetable.getOrganizerName(), timetable.getOrganizerPhone(), body
        );
    }

    private TimetableMessage toActor(Timetable timetable, TimetableActor actor, TimetableMessageType type, String body) {
        return new TimetableMessage(timetable.getId(), actor.getId(), type, actor.getName(), actor.getPhone(), body);
    }
}
