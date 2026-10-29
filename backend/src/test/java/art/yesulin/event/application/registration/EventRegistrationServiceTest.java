package art.yesulin.event.application.registration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.event.application.AdminEventResult;
import art.yesulin.event.application.EventService;
import art.yesulin.event.domain.EventContent;
import art.yesulin.event.domain.EventErrorCode;
import art.yesulin.event.domain.EventRegistrationStatus;
import art.yesulin.event.domain.EventRepository;
import art.yesulin.event.domain.EventStatus;
import art.yesulin.event.domain.registration.EventActivityField;
import art.yesulin.event.domain.registration.EventParticipantType;
import art.yesulin.event.domain.registration.EventPaymentStatus;
import art.yesulin.event.domain.registration.EventRegistrationCareer;
import art.yesulin.event.domain.registration.EventRegistrationForm;
import art.yesulin.event.domain.registration.EventRegistrationPhotoUploadRepository;
import art.yesulin.event.domain.registration.EventRegistrationRepository;
import art.yesulin.event.domain.registration.EventSnsPlatform;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:event-registration-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import({ObjectStorageTestConfiguration.class, EventRegistrationServiceTest.PrecisionClockConfiguration.class})
class EventRegistrationServiceTest {

    private static final long ADMIN_ID = 1L;
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0};
    private static final LocalDate BIRTH_DATE = LocalDate.of(2001, 3, 14);

    @Autowired
    private EventRegistrationService registrationService;

    @Autowired
    private EventService eventService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventRegistrationRepository registrationRepository;

    @Autowired
    private EventRegistrationPhotoUploadRepository uploadRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private FakeObjectStorage storage;

    @Autowired
    private BusinessCardArchive businessCardArchive;

    @BeforeEach
    void setUp() {
        registrationRepository.deleteAll();
        uploadRepository.deleteAll();
        eventRepository.deleteAll();
        auditLogRepository.deleteAll();
    }

    @Test
    void actorRegistersWithUploadedPhotoAndAdminSeesIt() {
        long eventId = openEvent();
        String photoKey = uploadedPhoto(eventId);

        registrationService.register(eventId, actor("010-1234-5678"), photoKey, true);

        List<AdminEventRegistrationResult> registrations = registrationService.findAllForAdmin(eventId);
        assertEquals(1, registrations.size());
        AdminEventRegistrationResult registration = registrations.getFirst();
        assertEquals(EventParticipantType.ACTOR, registration.participantType());
        assertEquals(BIRTH_DATE, registration.birthDate());
        assertEquals(EventSnsPlatform.INSTAGRAM, registration.snsPlatform());
        assertEquals("@haneul", registration.snsHandle());
        assertEquals(storage.createDownloadUrl(photoKey), registration.photoUrl());
        assertEquals(List.of(EventActivityField.THEATER, EventActivityField.MUSICAL), registration.activityFields());
        assertEquals(List.of(new AdminEventRegistrationResult.Career("2025-09", "연극 <달빛 정거장>", "민수 역")),
                registration.careers());
        assertTrue(uploadRepository.findByObjectKey(photoKey).isEmpty());
    }

    @Test
    void producerRegistersWithoutPhoto() {
        long eventId = openEvent();

        registrationService.register(eventId, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.PRODUCER, "이도현", "010-2345-6789", "남극장", "캐스팅 담당"
        ), null, true);

        AdminEventRegistrationResult registration = registrationService.findAllForAdmin(eventId).getFirst();
        assertEquals("남극장", registration.affiliation());
        assertEquals("캐스팅 담당", registration.currentWork());
        assertNull(registration.photoUrl());
    }

    @Test
    void actorWithoutBusinessCardRegistersWithoutPhotoAndIgnoresUploadedPhoto() {
        long eventId = openEvent();
        String photoKey = uploadedPhoto(eventId);

        registrationService.register(eventId, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.ACTOR, "박서윤", "010-3456-7890", null
        ), photoKey, true);

        AdminEventRegistrationResult registration = registrationService.findAllForAdmin(eventId).getFirst();
        assertFalse(registration.businessCardRequested());
        assertNull(registration.photoUrl());
        assertNull(registration.email());
        assertTrue(uploadRepository.findByObjectKey(photoKey).isPresent());
    }

    @Test
    void businessCardActorCannotRegisterWithoutPhoto() {
        long eventId = openEvent();

        assertThrows(BusinessException.class, () -> registrationService.register(
                eventId, actor("010-1234-5678"), null, true));
        assertTrue(registrationService.findAllForAdmin(eventId).isEmpty());
    }

    @Test
    void stopsBusinessCardsAfterDeadlineButKeepsTakingRegistrations() {
        long eventId = published(cardClosingAt(Instant.now().minusSeconds(60)));

        assertCode(EventErrorCode.BUSINESS_CARD_CLOSED,
                () -> registrationService.preparePhotoUpload(eventId, "image/jpeg", JPEG.length));
        assertCode(EventErrorCode.BUSINESS_CARD_CLOSED,
                () -> registrationService.register(eventId, actor("010-1234-5678"), null, true));
        registrationService.register(eventId, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.ACTOR, "박서윤", "010-3456-7890", null
        ), null, true);

        assertEquals(1, registrationService.findAllForAdmin(eventId).size());
        assertFalse(eventService.findPublic(eventId).businessCardOpen());
    }

    @Test
    void takesBusinessCardsBeforeDeadline() {
        long eventId = published(cardClosingAt(Instant.now().plusSeconds(3_600)));

        registrationService.register(eventId, actor("010-1234-5678"), uploadedPhoto(eventId), true);

        assertTrue(registrationService.findAllForAdmin(eventId).getFirst().businessCardRequested());
        assertTrue(eventService.findPublic(eventId).businessCardOpen());
    }

    @Test
    void exportsOnlyBusinessCardActorsWithPhotosAndLeavesAuditLog() throws Exception {
        long eventId = openEvent();
        String photoKey = uploadedPhoto(eventId);
        final long cardId = registrationService.register(eventId, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", true, "haneul@test.com", "@haneul", BIRTH_DATE,
                null, Set.of(EventActivityField.MUSICAL), null, false,
                List.of(new EventRegistrationCareer("2025-09", "연극 <달빛, 정거장>", "민수 역")),
                " 노래로 이야기를 전하는 배우 ", EventSnsPlatform.INSTAGRAM
        ), photoKey, true);
        registrationService.register(eventId, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.ACTOR, "박서윤", "010-3456-7890", null
        ), null, true);

        List<BusinessCardEntry> entries = registrationService.prepareBusinessCardExport(ADMIN_ID, eventId);
        ByteArrayOutputStream zip = new ByteArrayOutputStream();
        businessCardArchive.write(entries, zip);

        assertEquals(1, entries.size());
        assertEquals("노래로 이야기를 전하는 배우", entries.getFirst().intro());
        assertEquals(EventSnsPlatform.INSTAGRAM, entries.getFirst().snsPlatform());
        Map<String, byte[]> files = unzip(zip.toByteArray());
        assertTrue(files.containsKey("photos/%d.jpg".formatted(cardId)));
        String json = new String(files.get("business-cards.json"), StandardCharsets.UTF_8);
        assertTrue(json.contains("\"name\" : \"김하늘\""));
        assertTrue(json.contains("\"snsPlatform\" : \"INSTAGRAM\""));
        assertTrue(json.contains("\"photoFile\" : \"photos/%d.jpg\"".formatted(cardId)));
        assertFalse(json.contains("010-1234-5678"));
        assertFalse(json.contains("private/"));
        String csv = new String(files.get("business-cards.csv"), StandardCharsets.UTF_8);
        assertTrue(csv.startsWith("﻿신청번호"));
        assertTrue(csv.contains("\"2025-09 연극 <달빛, 정거장> 민수 역\""));
        assertTrue(csv.contains("'@haneul,INSTAGRAM"));
        assertTrue(auditLogRepository.findAll().stream()
                .map(AdminAuditLog::getAction)
                .anyMatch(AdminAction.EVENT_REGISTRATION_EXPORTED::equals));
    }

    @Test
    void rejectsSamePhoneTwiceInOneEvent() {
        long eventId = openEvent();
        registrationService.register(eventId, actor("010-1234-5678"), uploadedPhoto(eventId), true);

        BusinessException exception = assertThrows(BusinessException.class, () ->
                registrationService.register(eventId, actor("01012345678"), uploadedPhoto(eventId), true));
        assertEquals(EventErrorCode.REGISTRATION_DUPLICATE, exception.getErrorCode());
    }

    @Test
    void rejectsWithoutPrivacyConsentOrWithPhotoThatWasNotUploaded() {
        long eventId = openEvent();

        assertThrows(BusinessException.class, () ->
                registrationService.register(eventId, actor("010-1234-5678"), uploadedPhoto(eventId), false));
        String notUploaded = registrationService.preparePhotoUpload(eventId, "image/jpeg", JPEG.length).uploadKey();
        assertThrows(BusinessException.class, () ->
                registrationService.register(eventId, actor("010-1234-5678"), notUploaded, true));
        assertThrows(BusinessException.class, () -> registrationService.register(
                eventId, actor("010-1234-5678"), "private/company-photos/20261026/x", true));
        assertTrue(registrationService.findAllForAdmin(eventId).isEmpty());
    }

    @Test
    void acceptsOnlyPublishedEventsWithRegistrationOpen() {
        long pending = eventService.create(ADMIN_ID, content(true, null), null, null).id();
        long withoutForm = published(content(false, null));
        long ended = published(content(true, LocalDate.of(2020, 1, 1)));

        assertCode(EventErrorCode.NOT_FOUND, () -> registrationService.preparePhotoUpload(pending, "image/jpeg", 10));
        assertCode(EventErrorCode.REGISTRATION_CLOSED,
                () -> registrationService.preparePhotoUpload(withoutForm, "image/jpeg", 10));
        assertCode(EventErrorCode.REGISTRATION_CLOSED, () -> registrationService.register(
                ended, actor("010-1234-5678"), null, true));
    }

    @Test
    void adminDeletesRegistrationWithPhotoAndLeavesAuditLog() {
        long eventId = openEvent();
        String photoKey = uploadedPhoto(eventId);
        long id = registrationService.register(eventId, actor("010-1234-5678"), photoKey, true);

        registrationService.delete(ADMIN_ID, eventId, id);

        assertTrue(registrationService.findAllForAdmin(eventId).isEmpty());
        assertFalse(storage.contains(photoKey));
        assertTrue(auditLogRepository.findAll().stream()
                .map(AdminAuditLog::getAction)
                .anyMatch(AdminAction.EVENT_REGISTRATION_DELETED::equals));
        assertCode(EventErrorCode.REGISTRATION_NOT_FOUND, () -> registrationService.delete(ADMIN_ID, eventId, id));
    }

    @Test
    void deletingEventDeletesItsRegistrationsAndPhotos() {
        long eventId = openEvent();
        String photoKey = uploadedPhoto(eventId);
        registrationService.register(eventId, actor("010-1234-5678"), photoKey, true);

        eventService.delete(ADMIN_ID, eventId);

        assertEquals(0, registrationRepository.count());
        assertFalse(storage.contains(photoKey));
    }

    private long openEvent() {
        return published(content(true, null));
    }

    private long published(EventContent content) {
        AdminEventResult created = eventService.create(ADMIN_ID, content, null, null);
        eventService.changeStatus(ADMIN_ID, created.id(), EventStatus.PUBLISHED);
        return created.id();
    }

    private String uploadedPhoto(long eventId) {
        String key = registrationService.preparePhotoUpload(eventId, "image/jpeg", JPEG.length).uploadKey();
        storage.put(key, new ObjectUpload("image/jpeg", null, JPEG.length, new ByteArrayInputStream(JPEG)));
        return key;
    }

    private static EventRegistrationForm actor(String phone) {
        return new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", phone, true, "haneul@test.com", "@haneul", BIRTH_DATE, null,
                Set.of(EventActivityField.MUSICAL, EventActivityField.THEATER), null, false,
                List.of(new EventRegistrationCareer("2025-09", "연극 <달빛 정거장>", "민수 역")),
                null, EventSnsPlatform.INSTAGRAM
        );
    }

    private static EventContent cardClosingAt(Instant closesAt) {
        return new EventContent(
                "월요살롱", null, "본문", null, null, null, null, true, "보증금 안내", null, closesAt
        );
    }

    private static EventContent content(boolean registration, LocalDate endsOn) {
        return new EventContent(
                "월요살롱", null, "본문", null, endsOn, null, null, registration, registration ? "보증금 안내" : null
        );
    }

    private static void assertCode(EventErrorCode code, Runnable action) {
        BusinessException exception = assertThrows(BusinessException.class, action::run);
        assertEquals(code, exception.getErrorCode());
    }

    private static Map<String, byte[]> unzip(byte[] bytes) throws Exception {
        Map<String, byte[]> files = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes), StandardCharsets.UTF_8)) {
            for (ZipEntry entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                files.put(entry.getName(), zip.readAllBytes());
            }
        }
        return files;
    }
    @Test
    void combinedCapacityCountsAllParticipantTypesAndPreservesApplicants() {
        long eventId = capacityEvent(3);
        List<EventParticipantType> types = List.of(
                EventParticipantType.ACTOR, EventParticipantType.PRODUCER, EventParticipantType.ACTOR);
        for (int index = 0; index < types.size(); index++) {
            registrationService.register(eventId, EventRegistrationForm.withoutBusinessCard(
                    types.get(index), "참가자", "010-0000-%04d".formatted(index), "극단", "관계자"
            ), null, true);
        }
        assertEquals(3, registrationRepository.countByEventId(eventId));
        assertEquals(EventRegistrationStatus.FULL, eventService.findPublic(eventId).registrationStatus());
        assertFalse(eventService.findPublic(eventId).registrationOpen());
        assertCode(EventErrorCode.REGISTRATION_CLOSED, () -> registrationService.register(eventId,
                EventRegistrationForm.withoutBusinessCard(EventParticipantType.ACTOR, "초과", "010-1234-9000", null),
                null, true));
        assertEquals(3, registrationService.findAllForAdmin(eventId).size());
    }

    @Test
    void manualClosingAndCapacityChangesKeepNoticeAndExistingApplicants() {
        long eventId = capacityEvent(3);
        registrationService.register(eventId, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.ACTOR, "일반 참가자", "010-1234-9001", null), null, true);
        AdminEventResult closed = eventService.changeRegistrationClosed(ADMIN_ID, eventId, true);
        assertEquals(EventRegistrationStatus.CLOSED, closed.registrationStatus());
        assertEquals(1, closed.registrationCount());
        assertEquals("보증금 안내", closed.registrationNotice());
        assertEquals("신청 전 안내", closed.registrationConfirmationMessage());
        assertCode(EventErrorCode.REGISTRATION_CLOSED, () -> registrationService.register(eventId,
                EventRegistrationForm.withoutBusinessCard(EventParticipantType.ACTOR, "추가", "010-1234-9002", null),
                null, true));
        eventService.update(ADMIN_ID, eventId, capacityContent(1), null, null);
        assertEquals(EventRegistrationStatus.CLOSED, eventService.findPublic(eventId).registrationStatus());
        eventService.changeRegistrationClosed(ADMIN_ID, eventId, false);
        assertEquals(EventRegistrationStatus.FULL, eventService.findPublic(eventId).registrationStatus());
        eventService.update(ADMIN_ID, eventId, capacityContent(2), null, null);
        assertTrue(eventService.findPublic(eventId).registrationOpen());
        assertEquals(1, registrationService.findAllForAdmin(eventId).size());
    }

    @Test
    void paymentConfirmationIsIdempotentAuditedAndDoesNotChangeCapacity() {
        long eventId = capacityEvent(1);
        long id = registrationService.register(eventId, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.ACTOR, "일반 참가자", "010-1234-9003", null), null, true);
        AdminEventRegistrationResult initial = registrationService.findAllForAdmin(eventId).getFirst();
        assertEquals(EventPaymentStatus.PENDING, initial.paymentStatus());
        assertNull(initial.paymentConfirmedAt());
        AdminEventRegistrationResult confirmed = registrationService.changePaymentStatus(
                ADMIN_ID, eventId, id, EventPaymentStatus.CONFIRMED);
        assertTrue(confirmed.paymentConfirmedAt() != null);
        assertEquals(confirmed.paymentConfirmedAt(),
                registrationService.findAllForAdmin(eventId).getFirst().paymentConfirmedAt());
        assertEquals(confirmed.paymentConfirmedAt(), registrationService.changePaymentStatus(
                ADMIN_ID, eventId, id, EventPaymentStatus.CONFIRMED).paymentConfirmedAt());
        assertEquals(1, auditLogRepository.findAll().stream()
                .filter(log -> log.getAction() == AdminAction.EVENT_REGISTRATION_PAYMENT_CHANGED).count());
        assertEquals(EventRegistrationStatus.FULL, eventService.findPublic(eventId).registrationStatus());
        AdminEventRegistrationResult pending = registrationService.changePaymentStatus(
                ADMIN_ID, eventId, id, EventPaymentStatus.PENDING);
        assertNull(pending.paymentConfirmedAt());
        assertEquals(1, registrationRepository.countByEventId(eventId));
        long otherEvent = capacityEvent(1);
        assertCode(EventErrorCode.REGISTRATION_NOT_FOUND, () -> registrationService.changePaymentStatus(
                ADMIN_ID, otherEvent, id, EventPaymentStatus.CONFIRMED));
    }

    @Test
    void concurrentRegistrationsCannotExceedTheCombinedCapacity() throws Exception {
        long eventId = capacityEvent(3);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        try (var executor = Executors.newFixedThreadPool(12)) {
            for (int index = 0; index < 12; index++) {
                final String phone = "010-0001-%04d".formatted(index);
                results.add(executor.submit(() -> {
                    start.await();
                    try {
                        registrationService.register(eventId, EventRegistrationForm.withoutBusinessCard(
                                EventParticipantType.ACTOR, "동시 신청", phone, null), null, true);
                        return true;
                    } catch (BusinessException exception) {
                        assertEquals(EventErrorCode.REGISTRATION_CLOSED, exception.getErrorCode());
                        return false;
                    }
                }));
            }
            start.countDown();
            int success = 0;
            for (Future<Boolean> result : results) {
                if (result.get(10, TimeUnit.SECONDS)) {
                    success++;
                }
            }
            assertEquals(3, success);
        }
        assertEquals(3, registrationRepository.countByEventId(eventId));
    }

    @Test
    void deletionRestoresAutomaticSlotButKeepsManualClosure() {
        long eventId = capacityEvent(1);
        long id = registrationService.register(eventId, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.ACTOR, "취소 참가자", "010-1234-9004", null), null, true);
        assertEquals(EventRegistrationStatus.FULL, eventService.findPublic(eventId).registrationStatus());
        registrationService.delete(ADMIN_ID, eventId, id);
        assertTrue(eventService.findPublic(eventId).registrationOpen());
        eventService.changeRegistrationClosed(ADMIN_ID, eventId, true);
        assertEquals(EventRegistrationStatus.CLOSED, eventService.findPublic(eventId).registrationStatus());
    }

    private long capacityEvent(Integer capacity) {
        return published(capacityContent(capacity));
    }

    private static EventContent capacityContent(Integer capacity) {
        return new EventContent("선착순 이벤트", null, "본문", null, null, null, null,
                true, "보증금 안내", null, null, true, "신청 전 안내", capacity);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class PrecisionClockConfiguration {

        @Bean
        @Primary
        Clock highPrecisionClock() {
            // OS와 관계없이 DB의 마이크로초보다 정밀한 나노초 값을 사용한다.
            return Clock.offset(Clock.tick(Clock.systemUTC(), Duration.ofMillis(1)), Duration.ofNanos(123_456));
        }
    }

}
