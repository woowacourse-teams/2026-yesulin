package art.yesulin.application.timetable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.admin.AdminTimetableMessageResult;
import art.yesulin.application.admin.AdminTimetableMessageService;
import art.yesulin.application.admin.AdminTimetableMessagesResult;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.common.exception.ErrorCode;
import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.timetable.SelfChangeStatus;
import art.yesulin.domain.timetable.SlotAssignment;
import art.yesulin.domain.timetable.TimeSlot;
import art.yesulin.domain.timetable.TimetableActorRepository;
import art.yesulin.domain.timetable.TimetableErrorCode;
import art.yesulin.domain.timetable.TimetableMessage;
import art.yesulin.domain.timetable.TimetableMessageRepository;
import art.yesulin.domain.timetable.TimetableMessageStatus;
import art.yesulin.domain.timetable.TimetableMessageType;
import art.yesulin.domain.timetable.TimetableRepository;
import art.yesulin.domain.timetable.TimetableRequestRepository;
import art.yesulin.domain.timetable.TimetableStatus;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:timetable-service;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, TimetableServiceTest.TestConfig.class})
class TimetableServiceTest {

    /** 2026-10-03 10:00 한국 시간. 오디션 첫날(10월 10일)까지 일주일 남았다. */
    static final Instant NOW = Instant.parse("2026-10-03T01:00:00Z");
    private static final LocalDate DAY = LocalDate.of(2026, 10, 10);
    private static final TimeSlot TEN = new TimeSlot(DAY, LocalTime.of(10, 0));
    private static final TimeSlot TEN_THIRTY = new TimeSlot(DAY, LocalTime.of(10, 30));
    private static final TimeSlot ELEVEN = new TimeSlot(DAY, LocalTime.of(11, 0));
    private static final long OPERATOR_ID = 7L;

    @Autowired
    private TimetableService timetableService;

    @Autowired
    private ActorTimetableService actorTimetableService;

    @Autowired
    private AdminTimetableMessageService adminMessageService;

    @Autowired
    private TimetableRepository timetableRepository;

    @Autowired
    private TimetableActorRepository actorRepository;

    @Autowired
    private TimetableRequestRepository requestRepository;

    @Autowired
    private TimetableMessageRepository messageRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private RecordingRelay relay;

    @BeforeEach
    void setUp() {
        messageRepository.deleteAllInBatch();
        requestRepository.deleteAllInBatch();
        actorRepository.deleteAllInBatch();
        timetableRepository.deleteAll();
        auditLogRepository.deleteAllInBatch();
        relay.events.clear();
    }

    @Test
    void createsTimetableAndQueuesManageLinkForOrganizer() {
        TimetableCreatedResult created = create(1);

        assertEquals(TimetableStatus.DRAFT, created.timetable().status());
        assertEquals(List.of(new TimetableBoardResult.Window(DAY, LocalTime.of(10, 0), LocalTime.of(11, 30))),
                created.timetable().windows());
        assertEquals(24, created.timetable().selfChangeNoticeHours());
        TimetableMessage message = onlyMessage(TimetableMessageType.ORGANIZER_LINK);
        assertNull(message.getActorId());
        assertEquals("010-9999-0000", message.getRecipientPhone());
        assertTrue(message.getBody().endsWith("http://localhost:3000/timetable/manage/" + created.manageKey()));
        assertEquals(List.of(1), relay.counts());
    }

    @Test
    void registersActorsInBulkAndRejectsDuplicatePhones() {
        String key = create(1).manageKey();

        TimetableBoardResult board = register(key, "김배우", "010-1111-1111", "이배우", "010-2222-2222");

        assertEquals(List.of("김배우", "이배우"), board.actors().stream().map(TimetableBoardResult.Actor::name).toList());
        assertNull(board.actors().getFirst().slot());
        assertCode(TimetableErrorCode.DUPLICATE_ACTOR, () -> register(key, "박배우", "010-1111-1111"));
        assertCode(TimetableErrorCode.DUPLICATE_ACTOR,
                () -> register(key, "최배우", "010-3333-3333", "정배우", "010-3333-3333"));
        assertCode(TimetableErrorCode.INVALID_INPUT, () -> register(key, "최배우", "01033333333"));
        assertEquals(2, actorRepository.count());
    }

    @Test
    void publishesAndQueuesInvitationWithActorLink() {
        String key = create(1).manageKey();
        TimetableBoardResult board = register(key, "김배우", "010-1111-1111", "이배우", "010-2222-2222");
        long first = board.actors().get(0).id();
        long second = board.actors().get(1).id();
        assertCode(TimetableErrorCode.NOT_PUBLISHABLE, () -> timetableService.publish(key));

        save(key, 1, new SlotAssignment(first, null, TEN), new SlotAssignment(second, null, TEN_THIRTY));
        TimetableBoardResult published = timetableService.publish(key);

        assertEquals(TimetableStatus.PUBLISHED, published.status());
        assertTrue(published.actors().stream().allMatch(TimetableBoardResult.Actor::invited));
        List<TimetableMessage> invitations = messages(TimetableMessageType.ACTOR_INVITATION);
        assertEquals(2, invitations.size());
        String accessKey = actorRepository.findById(first).orElseThrow().getAccessKey();
        assertEquals("""
                안녕하세요 예술인입니다. 남극장 오디션 합격입니다. 해당 링크에서 일정을 확인하세요.
                http://localhost:3000/timetable/%s""".formatted(accessKey), invitations.getFirst().getBody());
        assertEquals(List.of(1, 2), relay.counts());
    }

    @Test
    void rejectsBoardThatBreaksBoundaryOrCapacity() {
        String key = create(1).manageKey();
        TimetableBoardResult board = register(key, "김배우", "010-1111-1111", "이배우", "010-2222-2222");
        long first = board.actors().get(0).id();
        long second = board.actors().get(1).id();

        assertCode(TimetableErrorCode.SLOT_UNAVAILABLE,
                () -> save(key, 1, new SlotAssignment(first, null, TEN), new SlotAssignment(second, null, TEN)));
        assertCode(TimetableErrorCode.SLOT_UNAVAILABLE,
                () -> save(key, 1, new SlotAssignment(first, null, new TimeSlot(DAY, LocalTime.of(12, 0)))));

        TimetableBoardResult saved = save(key, 2,
                new SlotAssignment(first, null, TEN), new SlotAssignment(second, null, TEN));
        assertEquals(2, saved.slotCapacity());
        assertEquals(TEN, slotOf(saved.actors().get(1).slot()));
    }

    @Test
    void organizerMoveAfterPublishingQueuesChangeOnlyWhenNoNoticeIsPending() {
        Published published = publishTwo();

        save(published.key(), 1, new SlotAssignment(published.first(), TEN, ELEVEN));
        assertEquals(0, messages(TimetableMessageType.ACTOR_SCHEDULE_CHANGED).size());

        completeAll(TimetableMessageType.ACTOR_INVITATION);
        save(published.key(), 1, new SlotAssignment(published.first(), ELEVEN, TEN));
        save(published.key(), 1, new SlotAssignment(published.first(), TEN, ELEVEN));

        List<TimetableMessage> changes = messages(TimetableMessageType.ACTOR_SCHEDULE_CHANGED);
        assertEquals(1, changes.size());
        assertTrue(changes.getFirst().getBody().startsWith("안녕하세요 예술인입니다. 남극장 오디션 일정이 변경되었습니다."));
        assertCode(TimetableErrorCode.INVALID_INPUT,
                () -> save(published.key(), 1, new SlotAssignment(published.first(), ELEVEN, null)));
    }

    @Test
    void invitesActorAddedAfterPublishingOnceAssigned() {
        Published published = publishTwo();
        long added = register(published.key(), "박배우", "010-3333-3333").actors().get(2).id();

        save(published.key(), 1, new SlotAssignment(added, null, ELEVEN));

        assertEquals(3, messages(TimetableMessageType.ACTOR_INVITATION).size());
        assertTrue(actorRepository.findById(added).orElseThrow().isInvited());
    }

    @Test
    void actorSeesOwnScheduleOnlyAfterPublishing() {
        String key = create(1).manageKey();
        long actorId = register(key, "김배우", "010-1111-1111").actors().getFirst().id();
        String accessKey = actorRepository.findById(actorId).orElseThrow().getAccessKey();
        save(key, 1, new SlotAssignment(actorId, null, TEN));
        assertCode(TimetableErrorCode.NOT_FOUND, () -> actorTimetableService.find(accessKey));

        timetableService.publish(key);
        ActorTimetableResult result = actorTimetableService.find(accessKey);

        assertEquals("김배우", result.actorName());
        assertEquals(TEN, slotOf(result.slot()));
        assertEquals(LocalTime.of(10, 30), result.slot().endTime());
        assertEquals(SelfChangeStatus.OPEN, result.selfChange());
        assertEquals(Instant.parse("2026-10-09T01:00:00Z"), result.changeDeadline());
        assertEquals(List.of(TEN_THIRTY, ELEVEN), result.openSlots().stream().map(this::slotOf).toList());
        assertCode(TimetableErrorCode.NOT_FOUND, () -> actorTimetableService.find("short"));
    }

    @Test
    void actorMovesIntoOpenSlotWithoutOrganizerApproval() {
        Published published = publishTwo();

        ActorTimetableResult result = actorTimetableService.changeSlot(published.firstKey(), TEN, ELEVEN);

        assertEquals(ELEVEN, slotOf(result.slot()));
        TimetableBoardResult.Actor actor = timetableService.find(published.key()).actors().getFirst();
        assertEquals(ELEVEN, slotOf(actor.slot()));
        assertEquals(TEN, slotOf(actor.previousSlot()));
        assertEquals(NOW, actor.actorChangedAt());
        assertEquals(0, messages(TimetableMessageType.ACTOR_SCHEDULE_CHANGED).size());
        assertCode(TimetableErrorCode.SLOT_UNAVAILABLE,
                () -> actorTimetableService.changeSlot(published.firstKey(), ELEVEN, TEN_THIRTY));
        assertCode(TimetableErrorCode.ASSIGNMENT_CONFLICT,
                () -> actorTimetableService.changeSlot(published.firstKey(), TEN, ELEVEN));

        timetableService.changeSelfChangeLock(published.key(), true);
        assertEquals(SelfChangeStatus.LOCKED, actorTimetableService.find(published.firstKey()).selfChange());
        assertCode(TimetableErrorCode.SELF_CHANGE_CLOSED,
                () -> actorTimetableService.changeSlot(published.firstKey(), ELEVEN, TEN));
    }

    @Test
    void groupsTimeRequestNoticesUntilOperatorSendsThem() {
        Published published = publishTwo();

        actorTimetableService.requestTime(published.firstKey(), "평일 저녁만 가능합니다.");
        ActorTimetableResult rewritten = actorTimetableService.requestTime(published.firstKey(), "토요일 오후 가능합니다.");
        actorTimetableService.requestTime(published.secondKey(), "다음 주가 좋아요.");

        assertEquals("토요일 오후 가능합니다.", rewritten.request().message());
        TimetableBoardResult board = timetableService.find(published.key());
        assertEquals(List.of("토요일 오후 가능합니다.", "다음 주가 좋아요."),
                board.requests().stream().map(TimetableBoardResult.Request::message).toList());
        assertEquals(1, messages(TimetableMessageType.ORGANIZER_TIME_REQUEST).size());

        completeAll(TimetableMessageType.ORGANIZER_TIME_REQUEST);
        actorTimetableService.requestTime(published.secondKey(), "다음 주 화요일이 좋아요.");
        assertEquals(1, pending(TimetableMessageType.ORGANIZER_TIME_REQUEST));
    }

    @Test
    void resolvesRequestWhenOrganizerMovesActorOrClosesIt() {
        Published published = publishTwo();
        actorTimetableService.requestTime(published.firstKey(), "11시가 좋아요.");
        actorTimetableService.requestTime(published.secondKey(), "전화로 이야기했어요.");

        save(published.key(), 1, new SlotAssignment(published.first(), TEN, ELEVEN));
        long remaining = timetableService.find(published.key()).requests().getFirst().id();
        TimetableBoardResult board = timetableService.resolveRequest(published.key(), remaining);

        assertTrue(board.requests().isEmpty());
        assertNull(actorTimetableService.find(published.firstKey()).request());
    }

    @Test
    void removingActorClosesLinkAndDropsUnsentMessages() {
        Published published = publishTwo();
        actorTimetableService.requestTime(published.firstKey(), "시간 조정 부탁드립니다.");

        TimetableBoardResult board = timetableService.removeActor(published.key(), published.first());

        assertEquals(1, board.actors().size());
        assertCode(TimetableErrorCode.NOT_FOUND, () -> actorTimetableService.find(published.firstKey()));
        assertEquals(1, messages(TimetableMessageType.ACTOR_INVITATION).size());
        assertTrue(board.requests().isEmpty());
    }

    @Test
    void operatorMarksQueuedMessagesSentOnceWithAuditLog() {
        publishTwo();
        AdminTimetableMessagesResult pendingResult = adminMessageService.find(TimetableMessageStatus.PENDING);
        assertEquals(3, pendingResult.pendingCount());
        AdminTimetableMessageResult link = pendingResult.messages().getFirst();
        assertEquals(TimetableMessageType.ORGANIZER_LINK, link.type());
        assertEquals("남극장 2차 오디션", link.timetableTitle());

        List<Long> ids = pendingResult.messages().stream().map(AdminTimetableMessageResult::id).toList();
        adminMessageService.complete(OPERATOR_ID, ids);
        List<AdminTimetableMessageResult> again = adminMessageService.complete(OPERATOR_ID, ids.subList(0, 1));

        assertEquals(TimetableMessageStatus.SENT, again.getFirst().status());
        assertEquals(0, adminMessageService.find(TimetableMessageStatus.PENDING).pendingCount());
        assertEquals(3, adminMessageService.find(TimetableMessageStatus.SENT).messages().size());
        assertEquals(3, auditLogRepository.findAll().stream()
                .filter(log -> log.getAction() == AdminAction.TIMETABLE_MESSAGE_SENT)
                .count());
        assertCode(TimetableErrorCode.MESSAGE_NOT_FOUND, () -> adminMessageService.complete(OPERATOR_ID, List.of(999L)));
    }

    @Test
    void hidesTimetableFromMalformedOrUnknownManageKey() {
        create(1);

        assertCode(TimetableErrorCode.NOT_FOUND, () -> timetableService.find("not-a-key"));
        assertCode(TimetableErrorCode.NOT_FOUND,
                () -> timetableService.find("A".repeat(43)));
    }

    private Published publishTwo() {
        String key = create(1).manageKey();
        TimetableBoardResult board = register(key, "김배우", "010-1111-1111", "이배우", "010-2222-2222");
        long first = board.actors().get(0).id();
        long second = board.actors().get(1).id();
        save(key, 1, new SlotAssignment(first, null, TEN), new SlotAssignment(second, null, TEN_THIRTY));
        timetableService.publish(key);
        return new Published(
                key,
                first,
                actorRepository.findById(first).orElseThrow().getAccessKey(),
                actorRepository.findById(second).orElseThrow().getAccessKey()
        );
    }

    private TimetableCreatedResult create(int capacity) {
        return timetableService.create(new CreateTimetableCommand(
                new TimetableProfileCommand("남극장 2차 오디션", "남극장", "010-9999-0000", "남극장 연습실", "대본 지참"),
                setting(capacity)
        ));
    }

    private TimetableSettingCommand setting(int capacity) {
        return new TimetableSettingCommand(30, capacity, List.of(
                new TimetableWindowCommand(DAY, LocalTime.of(10, 0), LocalTime.of(11, 30))
        ));
    }

    private TimetableBoardResult register(String key, String... namesAndPhones) {
        List<ActorContactCommand> contacts = new ArrayList<>();
        for (int index = 0; index < namesAndPhones.length; index += 2) {
            contacts.add(new ActorContactCommand(namesAndPhones[index], namesAndPhones[index + 1]));
        }
        return timetableService.registerActors(key, contacts);
    }

    private TimetableBoardResult save(String key, int capacity, SlotAssignment... assignments) {
        return timetableService.saveBoard(key, new SaveTimetableBoardCommand(setting(capacity), List.of(assignments)));
    }

    private void completeAll(TimetableMessageType type) {
        adminMessageService.complete(OPERATOR_ID, messages(type).stream()
                .filter(TimetableMessage::isPending)
                .map(TimetableMessage::getId)
                .toList());
    }

    private long pending(TimetableMessageType type) {
        return messages(type).stream().filter(TimetableMessage::isPending).count();
    }

    private List<TimetableMessage> messages(TimetableMessageType type) {
        return messageRepository.findAll().stream().filter(message -> message.getType() == type).toList();
    }

    private TimetableMessage onlyMessage(TimetableMessageType type) {
        List<TimetableMessage> messages = messages(type);
        assertEquals(1, messages.size());
        assertFalse(messages.getFirst().getBody().isBlank());
        assertNotNull(messages.getFirst().getCreatedAt());
        return messages.getFirst();
    }

    private TimeSlot slotOf(TimeSlotResult result) {
        return new TimeSlot(result.date(), result.startTime());
    }

    private void assertCode(ErrorCode expected, Runnable action) {
        BusinessException exception = assertThrows(BusinessException.class, action::run);
        assertEquals(expected, exception.getErrorCode());
    }

    private record Published(String key, long first, String firstKey, String secondKey) {
    }

    static class RecordingRelay implements TimetableMessageRelay {

        private final List<TimetableMessagesQueuedEvent> events = new ArrayList<>();

        @Override
        public void relay(TimetableMessagesQueuedEvent event) {
            events.add(event);
        }

        List<Integer> counts() {
            return events.stream().map(TimetableMessagesQueuedEvent::count).toList();
        }
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        @Primary
        Clock fixedTimetableClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }

        @Bean
        @Primary
        RecordingRelay recordingRelay() {
            return new RecordingRelay();
        }
    }
}
