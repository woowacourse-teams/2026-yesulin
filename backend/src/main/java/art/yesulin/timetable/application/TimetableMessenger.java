package art.yesulin.timetable.application;

import art.yesulin.timetable.domain.Timetable;
import art.yesulin.timetable.domain.TimetableRepository;
import art.yesulin.timetable.domain.actor.TimetableActor;
import art.yesulin.timetable.domain.message.TimetableMessage;
import art.yesulin.timetable.domain.message.TimetableMessageRepository;
import art.yesulin.timetable.domain.message.TimetableMessageStatus;
import art.yesulin.timetable.domain.message.TimetableMessageType;
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

    private static final String ACTOR_CAUTION = "[주의] 본인만 쓰는 링크입니다. 다른 사람에게 보내지 마세요.";
    private static final String ORGANIZER_CAUTION =
            "[주의] 링크를 가진 사람은 누구나 일정표를 고칠 수 있습니다. 외부에 공유하지 마세요.";
    private static final List<TimetableMessageType> ACTOR_NOTICE_TYPES = List.of(
            TimetableMessageType.ACTOR_INVITATION,
            TimetableMessageType.ACTOR_SCHEDULE_CHANGED
    );

    private final TimetableRepository timetableRepository;
    private final TimetableMessageRepository messageRepository;
    private final TimetableLinks links;
    private final ApplicationEventPublisher eventPublisher;

    public void sendManageLink(long timetableId) {
        Timetable timetable = timetableRepository.findById(timetableId).orElseThrow();
        queue(timetable, List.of(manageLinkMessage(timetable)));
    }

    private TimetableMessage manageLinkMessage(Timetable timetable) {
        String body = compose(
                "오디션 일정표 관리 링크",
                organizerGreeting(timetable),
                """
                '%s' 일정표를 만들었습니다.
                아래 링크에서 합격자 등록과 일정 확정을 할 수 있습니다.""".formatted(timetable.getProfile().getTitle()),
                "일정표 관리",
                links.manage(timetable.getManageKey()),
                ORGANIZER_CAUTION
        );
        return toOrganizer(timetable, TimetableMessageType.ORGANIZER_LINK, body);
    }

    public TimetableMessage invitation(Timetable timetable, TimetableActor actor) {
        String body = compose(
                "오디션 합격 안내",
                actorGreeting(actor),
                """
                %s 오디션에 합격하셨습니다.
                아래 링크에서 '%s' 일정을 확인해 주세요.""".formatted(timetable.getProfile().getOrganizerName(), timetable.getProfile().getTitle()),
                "내 오디션 일정",
                links.actor(actor.getAccessKey()),
                ACTOR_CAUTION
        );
        return toActor(timetable, actor, TimetableMessageType.ACTOR_INVITATION, body);
    }

    /** 아직 보내지 않은 안내나 변경 문자가 있으면 그 링크로 최신 일정을 보므로 만들지 않는다. */
    public Optional<TimetableMessage> scheduleChange(Timetable timetable, TimetableActor actor) {
        if (messageRepository.existsByActorIdAndStatusAndTypeIn(
                actor.getId(), TimetableMessageStatus.PENDING, ACTOR_NOTICE_TYPES)) {
            return Optional.empty();
        }
        String body = compose(
                "오디션 일정 변경 안내",
                actorGreeting(actor),
                """
                %s '%s' 일정이 변경되었습니다.
                아래 링크에서 바뀐 시간을 확인해 주세요.""".formatted(timetable.getProfile().getOrganizerName(), timetable.getProfile().getTitle()),
                "내 오디션 일정",
                links.actor(actor.getAccessKey()),
                ACTOR_CAUTION
        );
        return Optional.of(toActor(timetable, actor, TimetableMessageType.ACTOR_SCHEDULE_CHANGED, body));
    }

    /** 요청마다 보내지 않고, 아직 보내지 않은 요청 알림이 있으면 그 알림 하나로 묶는다. */
    public Optional<TimetableMessage> timeRequest(Timetable timetable) {
        if (messageRepository.existsByTimetableIdAndStatusAndType(
                timetable.getId(), TimetableMessageStatus.PENDING, TimetableMessageType.ORGANIZER_TIME_REQUEST)) {
            return Optional.empty();
        }
        String body = compose(
                "시간 조정 요청 알림",
                organizerGreeting(timetable),
                """
                '%s' 일정표에 배우의 시간 조정 요청이 들어왔습니다.
                아래 링크에서 확인해 주세요.""".formatted(timetable.getProfile().getTitle()),
                "일정표 관리",
                links.manage(timetable.getManageKey()),
                ORGANIZER_CAUTION
        );
        return Optional.of(toOrganizer(timetable, TimetableMessageType.ORGANIZER_TIME_REQUEST, body));
    }

    public void queue(Timetable timetable, List<TimetableMessage> messages) {
        if (messages.isEmpty()) {
            return;
        }
        messageRepository.saveAll(messages);
        eventPublisher.publishEvent(new TimetableMessagesQueuedEvent(
                timetable.getId(), timetable.getProfile().getTitle(), messages.size()
        ));
    }

    /** 명단에서 뺀 배우에게 아직 보내지 않은 문자는 보내지 않는다. 이미 보낸 기록은 남긴다. */
    public void discardPending(TimetableActor actor) {
        messageRepository.deleteAllByActorIdAndStatus(actor.getId(), TimetableMessageStatus.PENDING);
    }

    /**
     * 모든 일정표 문자의 틀이다. 문자 업체로 바꿔도 깨지지 않도록 이모지 대신 일반 특수문자로 링크와 주의 문구를 구분하고,
     * 마지막에 예술인 주소를 붙인다.
     */
    private String compose(String subject, String greeting, String content, String linkLabel, String link,
                           String caution) {
        return """
                [예술인] %s

                %s
                %s

                ▶ %s
                %s

                %s

                예술인 %s""".formatted(subject, greeting, content, linkLabel, link, caution, links.home());
    }

    private static String organizerGreeting(Timetable timetable) {
        return timetable.getProfile().getOrganizerName() + " 담당자님, 안녕하세요.";
    }

    private static String actorGreeting(TimetableActor actor) {
        return "지원자 " + actor.getName() + "님, 안녕하세요.";
    }

    private TimetableMessage toOrganizer(Timetable timetable, TimetableMessageType type, String body) {
        return new TimetableMessage(
                timetable.getId(), null, type, timetable.getProfile().getOrganizerName(), timetable.getProfile().getOrganizerPhone(), body
        );
    }

    private TimetableMessage toActor(Timetable timetable, TimetableActor actor, TimetableMessageType type, String body) {
        return new TimetableMessage(timetable.getId(), actor.getId(), type, actor.getName(), actor.getPhone(), body);
    }
}
