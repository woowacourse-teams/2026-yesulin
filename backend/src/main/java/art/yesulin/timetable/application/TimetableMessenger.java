package art.yesulin.timetable.application;

import art.yesulin.timetable.domain.Timetable;
import art.yesulin.timetable.domain.TimetableProfile;
import art.yesulin.timetable.domain.TimetableRepository;
import art.yesulin.timetable.domain.actor.TimetableActor;
import art.yesulin.timetable.domain.message.InvitationValues;
import art.yesulin.timetable.domain.message.TimetableMessage;
import art.yesulin.timetable.domain.message.TimetableMessageRepository;
import art.yesulin.timetable.domain.message.TimetableMessageStatus;
import art.yesulin.timetable.domain.message.TimetableMessageType;
import art.yesulin.timetable.domain.setting.TimeSlot;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

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
    private static final DateTimeFormatter SCHEDULE_DATE = DateTimeFormatter.ofPattern("M월 d일 (E)", Locale.KOREAN);

    private final TimetableRepository timetableRepository;
    private final TimetableMessageRepository messageRepository;
    private final TimetableLinks links;
    private final ApplicationEventPublisher eventPublisher;

    public void sendManageLink(long timetableId) {
        Timetable timetable = timetableRepository.findById(timetableId).orElseThrow();
        String body = compose(
                "오디션 일정표 관리 링크",
                """
                %s
                '%s' 오디션 일정표를 만들었습니다.
                아래 링크에서 합격자 등록과 일정 확정을 할 수 있습니다.""".formatted(
                        organizerGreeting(timetable), timetable.getProfile().getTitle()
                ),
                "일정표 관리",
                links.manage(timetable.getManageKey()),
                ORGANIZER_CAUTION
        );
        queue(timetable, List.of(toOrganizer(timetable, TimetableMessageType.ORGANIZER_LINK, body)));
    }

    public TimetableMessage invitation(Timetable timetable, TimetableActor actor) {
        return toActor(timetable, actor, TimetableMessageType.ACTOR_INVITATION, invitationBody(timetable, actor));
    }

    /** 아직 보내지 않은 안내·변경 문자가 있으면 새로 쌓지 않고 그 문자를 바뀐 일정으로 고친다. */
    public Optional<TimetableMessage> scheduleChange(Timetable timetable, TimetableActor actor) {
        List<TimetableMessage> pending = messageRepository.findAllByActorIdAndStatusAndTypeIn(
                actor.getId(), TimetableMessageStatus.PENDING, ACTOR_NOTICE_TYPES
        );
        if (pending.isEmpty()) {
            return Optional.of(toActor(
                    timetable, actor, TimetableMessageType.ACTOR_SCHEDULE_CHANGED, scheduleChangeBody(timetable, actor)
            ));
        }
        pending.forEach(message -> message.rewrite(bodyOf(message.getType(), timetable, actor)));
        return Optional.empty();
    }

    public void refreshPendingInvitations(Timetable timetable, List<TimetableActor> actors) {
        Map<Long, TimetableActor> actorsById = actors.stream()
                .collect(Collectors.toMap(TimetableActor::getId, Function.identity()));
        messageRepository.findAllByTimetableIdAndStatusAndType(
                timetable.getId(), TimetableMessageStatus.PENDING, TimetableMessageType.ACTOR_INVITATION
        ).forEach(message -> message.rewrite(invitationBody(timetable, actorsById.get(message.getActorId()))));
    }

    /** 요청마다 보내지 않고, 아직 보내지 않은 문의 알림이 있으면 그 알림 하나로 묶는다. */
    public Optional<TimetableMessage> timeRequest(Timetable timetable) {
        if (messageRepository.existsByTimetableIdAndStatusAndType(
                timetable.getId(), TimetableMessageStatus.PENDING, TimetableMessageType.ORGANIZER_TIME_REQUEST)) {
            return Optional.empty();
        }
        String body = compose(
                "시간 변경 문의 알림",
                """
                %s
                '%s' 오디션 일정표에 배우의 시간 변경 문의가 들어왔습니다.
                아래 링크에서 확인해 주세요.""".formatted(organizerGreeting(timetable), timetable.getProfile().getTitle()),
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

    private String bodyOf(TimetableMessageType type, Timetable timetable, TimetableActor actor) {
        return type == TimetableMessageType.ACTOR_INVITATION
                ? invitationBody(timetable, actor)
                : scheduleChangeBody(timetable, actor);
    }

    private String invitationBody(Timetable timetable, TimetableActor actor) {
        TimetableProfile profile = timetable.getProfile();
        String content = timetable.getInvitationTemplate().render(new InvitationValues(
                actor.getName(),
                profile.getTitle(),
                profile.getOrganizerName(),
                scheduleOf(timetable, actor),
                profile.getLocation(),
                profile.getGuide()
        ));
        return compose("오디션 합격 안내", content, "내 오디션 일정", links.actor(actor.getAccessKey()), ACTOR_CAUTION);
    }

    private String scheduleChangeBody(Timetable timetable, TimetableActor actor) {
        String content = """
                지원자 %s님, 안녕하세요.
                %s '%s' 오디션 일정이 변경되었습니다.
                아래 링크에서 바뀐 시간을 확인해 주세요.""".formatted(
                actor.getName(), timetable.getProfile().getOrganizerName(), timetable.getProfile().getTitle()
        );
        return compose("오디션 일정 변경 안내", content, "내 오디션 일정", links.actor(actor.getAccessKey()), ACTOR_CAUTION);
    }

    private static String scheduleOf(Timetable timetable, TimetableActor actor) {
        TimeSlot slot = actor.getSlot();
        if (slot == null) {
            return "";
        }
        return "%s %s~%s".formatted(slot.date().format(SCHEDULE_DATE), slot.startTime(), timetable.endTimeOf(slot));
    }

    /**
     * 모든 일정표 문자의 틀이다. 문자 업체로 바꿔도 깨지지 않도록 이모지 대신 일반 특수문자로 링크와 주의 문구를 구분하고,
     * 마지막에 예술인 주소를 붙인다.
     */
    private String compose(String subject, String content, String linkLabel, String link, String caution) {
        return """
                [예술인] %s

                %s

                ▶ %s
                %s

                %s

                예술인 %s""".formatted(subject, content, linkLabel, link, caution, links.home());
    }

    private static String organizerGreeting(Timetable timetable) {
        TimetableProfile profile = timetable.getProfile();
        String contact = profile.getContactName().isEmpty() ? "담당자" : profile.getContactName();
        return profile.getOrganizerName() + " " + contact + "님, 안녕하세요.";
    }

    private TimetableMessage toOrganizer(Timetable timetable, TimetableMessageType type, String body) {
        TimetableProfile profile = timetable.getProfile();
        return new TimetableMessage(
                timetable.getId(), null, type, profile.getOrganizerName(), profile.getOrganizerPhone(), body
        );
    }

    private TimetableMessage toActor(Timetable timetable, TimetableActor actor, TimetableMessageType type, String body) {
        return new TimetableMessage(timetable.getId(), actor.getId(), type, actor.getName(), actor.getPhone(), body);
    }
}
