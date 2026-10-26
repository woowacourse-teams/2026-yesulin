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
import art.yesulin.event.domain.EventRepository;
import art.yesulin.event.domain.EventStatus;
import art.yesulin.event.domain.registration.EventActivityField;
import art.yesulin.event.domain.registration.EventParticipantType;
import art.yesulin.event.domain.registration.EventRegistrationCareer;
import art.yesulin.event.domain.registration.EventRegistrationForm;
import art.yesulin.event.domain.registration.EventRegistrationPhotoUploadRepository;
import art.yesulin.event.domain.registration.EventRegistrationRepository;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:event-registration-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
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
                EventParticipantType.PRODUCER, "이도현", "010-2345-6789", "남극장 · 캐스팅 담당"
        ), null, true);

        AdminEventRegistrationResult registration = registrationService.findAllForAdmin(eventId).getFirst();
        assertEquals("남극장 · 캐스팅 담당", registration.affiliation());
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
                List.of(new EventRegistrationCareer("2025-09", "연극 <달빛 정거장>", "민수 역"))
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
}
