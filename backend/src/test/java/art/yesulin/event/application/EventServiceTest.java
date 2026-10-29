package art.yesulin.event.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.event.application.image.EventImageService;
import art.yesulin.event.application.image.EventImageUploadResult;
import art.yesulin.event.domain.EventBankAccount;
import art.yesulin.event.domain.EventBannerSetting;
import art.yesulin.event.domain.EventContent;
import art.yesulin.event.domain.EventErrorCode;
import art.yesulin.event.domain.EventRepository;
import art.yesulin.event.domain.EventStatus;
import art.yesulin.event.domain.image.EventImageUploadRepository;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:event-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class EventServiceTest {

    private static final long ADMIN_ID = 1L;
    private static final long OTHER_ADMIN_ID = 2L;
    private static final byte[] WEBP = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '};

    @Autowired
    private EventService eventService;

    @Autowired
    private EventImageService imageService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventImageUploadRepository uploadRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private FakeObjectStorage storage;

    @BeforeEach
    void setUp() {
        eventRepository.deleteAll();
        uploadRepository.deleteAll();
        auditLogRepository.deleteAll();
    }

    @Test
    void showsEventOnlyAfterAdminPublishesIt() {
        AdminEventResult created = eventService.create(ADMIN_ID, content("1기 서포터즈 모집"), null, null);

        assertEquals(EventStatus.PENDING, created.status());
        assertTrue(eventService.findPublished().isEmpty());
        assertNotFound(created.id());

        eventService.changeStatus(ADMIN_ID, created.id(), EventStatus.PUBLISHED);
        List<PublicEventSummaryResult> published = eventService.findPublished();
        assertEquals(List.of(created.id()), published.stream().map(PublicEventSummaryResult::id).toList());
        assertEquals("본문", eventService.findPublic(created.id()).body());

        eventService.changeStatus(ADMIN_ID, created.id(), EventStatus.HIDDEN);
        assertNotFound(created.id());
        assertEquals(
                List.of(AdminAction.EVENT_CREATED, AdminAction.EVENT_STATUS_CHANGED, AdminAction.EVENT_STATUS_CHANGED),
                auditLogRepository.findAll().stream().map(AdminAuditLog::getAction).toList()
        );
    }

    @Test
    void persistsConfirmationSettingsForAdminAndPublicDetail() {
        EventBankAccount account = new EventBankAccount("테스트은행", "001-002-003", "예술인");
        EventContent content = new EventContent("행사", null, "소개", null, null, null, null,
                true, null, null, null, true, " 안내\r\n둘째 줄 ", null, account);
        AdminEventResult created = eventService.create(ADMIN_ID, content, null, null);
        eventService.changeStatus(ADMIN_ID, created.id(), EventStatus.PUBLISHED);

        AdminEventResult stored = eventService.findForAdmin(created.id());
        assertTrue(stored.registrationConfirmationEnabled());
        assertEquals("안내\n둘째 줄", stored.registrationConfirmationMessage());
        PublicEventResult published = eventService.findPublic(created.id());
        assertTrue(published.registrationConfirmationEnabled());
        assertEquals(stored.registrationConfirmationMessage(), published.registrationConfirmationMessage());
        assertEquals(account, stored.registrationBankAccount());
        assertEquals(account, published.registrationBankAccount());

        eventService.update(ADMIN_ID, created.id(), content("행사"), null, null);
        PublicEventResult disabled = eventService.findPublic(created.id());
        assertFalse(disabled.registrationConfirmationEnabled());
        assertNull(disabled.registrationConfirmationMessage());
        assertNull(disabled.registrationBankAccount());
    }

    @Test
    void bannerIsListedWhilePublishedAndUntilItsEndDateInOrder() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        long later = publishedWithBanner("나중 배너", today.plusDays(7), 5);
        long first = publishedWithBanner("먼저 배너", null, 1);
        long expired = publishedWithBanner("끝난 배너", today.minusDays(1), 0);
        assertFalse(eventService.findForAdmin(expired).bannerVisible());
        AdminEventResult pending = eventService.create(
                ADMIN_ID, content("검토 전"), banner("검토 전", null, 0), bannerUrls()
        );
        assertFalse(pending.bannerVisible());

        List<EventBannerResult> banners = eventService.findBanners();

        assertEquals(List.of(first, later), banners.stream().map(EventBannerResult::eventId).toList());
        assertEquals("먼저 배너 배너", banners.getFirst().alt());
        assertTrue(banners.getFirst().desktopImageUrl().startsWith("https://cdn.test/assets/files/events/"));
    }

    @Test
    void adminBannerVisibleFollowsTheSameFiveBannerLimitAsHome() {
        List<Long> ids = new ArrayList<>();
        for (int order = 0; order <= EventService.MAX_BANNERS; order++) {
            ids.add(publishedWithBanner("배너 " + order, null, order));
        }
        long hiddenByLimit = ids.getLast();

        List<Long> shownOnHome = eventService.findBanners().stream().map(EventBannerResult::eventId).toList();
        List<Long> markedVisible = eventService.findAllForAdmin().stream()
                .filter(AdminEventResult::bannerVisible)
                .map(AdminEventResult::id)
                .toList();

        assertEquals(EventService.MAX_BANNERS, shownOnHome.size());
        assertEquals(Set.copyOf(shownOnHome), Set.copyOf(markedVisible));
        assertFalse(eventService.findForAdmin(hiddenByLimit).bannerVisible());
    }

    @Test
    void replacedAndRemovedImagesAreDeletedFromStorage() {
        String firstCover = uploaded(ADMIN_ID);
        AdminEventResult created = eventService.create(
                ADMIN_ID, content("이벤트"), null, new EventImageUrls(firstCover, null, null)
        );
        String firstKey = keyOf(firstCover);
        assertEquals(firstCover, created.coverImageUrl());
        assertTrue(uploadRepository.findByObjectKey(firstKey).isEmpty());

        AdminEventResult kept = eventService.update(
                ADMIN_ID, created.id(), content("이벤트"), null, new EventImageUrls(firstCover, null, null)
        );
        assertEquals(firstCover, kept.coverImageUrl());
        assertTrue(storage.contains(firstKey));

        String secondCover = uploaded(ADMIN_ID);
        eventService.update(ADMIN_ID, created.id(), content("이벤트"), null, new EventImageUrls(secondCover, null, null));
        assertFalse(storage.contains(firstKey));

        AdminEventResult cleared = eventService.update(ADMIN_ID, created.id(), content("이벤트"), null, null);
        assertNull(cleared.coverImageUrl());
        assertFalse(storage.contains(keyOf(secondCover)));
    }

    @Test
    void deletingEventRemovesRowImagesAndBannerAndLeavesAuditLog() {
        AdminEventResult created = eventService.create(
                ADMIN_ID, content("지울 이벤트"), banner("지울 이벤트", null, 0),
                new EventImageUrls(uploaded(ADMIN_ID), uploaded(ADMIN_ID), uploaded(ADMIN_ID))
        );
        eventService.changeStatus(ADMIN_ID, created.id(), EventStatus.PUBLISHED);

        eventService.delete(ADMIN_ID, created.id());

        assertTrue(eventRepository.findById(created.id()).isEmpty());
        assertTrue(eventService.findBanners().isEmpty());
        assertFalse(storage.contains(keyOf(created.coverImageUrl())));
        assertFalse(storage.contains(keyOf(created.banner().desktopImageUrl())));
        assertFalse(storage.contains(keyOf(created.banner().mobileImageUrl())));
        assertTrue(auditLogRepository.findAll().stream().anyMatch(log ->
                log.getAction() == AdminAction.EVENT_DELETED && log.getTargetId() == created.id()));
        BusinessException missing = assertThrows(BusinessException.class, () ->
                eventService.delete(ADMIN_ID, created.id()));
        assertEquals(EventErrorCode.NOT_FOUND, missing.getErrorCode());
    }

    @Test
    void rejectsImageUploadedByAnotherAdminUnknownAddressOrWrongContent() {
        String othersImage = uploaded(OTHER_ADMIN_ID);
        assertThrows(BusinessException.class, () -> eventService.create(
                ADMIN_ID, content("이벤트"), null, new EventImageUrls(othersImage, null, null)));
        assertThrows(BusinessException.class, () -> eventService.create(
                ADMIN_ID, content("이벤트"), null, new EventImageUrls("https://evil.test/a.webp", null, null)));

        EventImageUploadResult html = imageService.prepare(ADMIN_ID, "image/webp", 12);
        storage.put(keyOf(html.imageUrl()), new ObjectUpload(
                "image/webp", null, 12, new ByteArrayInputStream("<html>evil!!".getBytes())
        ));
        assertThrows(BusinessException.class, () -> eventService.create(
                ADMIN_ID, content("이벤트"), null, new EventImageUrls(html.imageUrl(), null, null)));
    }

    @Test
    void rejectsUnsupportedTypeAndOversizedImage() {
        assertThrows(BusinessException.class, () -> imageService.prepare(ADMIN_ID, "image/svg+xml", 100));
        assertThrows(BusinessException.class, () -> imageService.prepare(ADMIN_ID, "image/gif", 100));
        assertThrows(BusinessException.class, () ->
                imageService.prepare(ADMIN_ID, "image/png", 5L * 1024 * 1024 + 1));
    }

    @Test
    void storesReordersRemovesAndDeletesDetailImagesAndText() {
        String first = uploaded(ADMIN_ID);
        String second = uploaded(ADMIN_ID);
        EventContent content = new EventContent(
                "범용 이벤트", null, "자유로운 개요", null, null, null, null, false, null, "상세 설명"
        );
        AdminEventResult created = eventService.create(
                ADMIN_ID, content, null, new EventImageUrls(null, null, null, List.of(first, second))
        );
        eventService.changeStatus(ADMIN_ID, created.id(), EventStatus.PUBLISHED);

        assertEquals("상세 설명", eventService.findPublic(created.id()).detailBody());
        assertEquals(List.of(first, second), eventService.findPublic(created.id()).detailImageUrls());
        assertEquals("자유로운 개요", created.body());

        AdminEventResult reordered = eventService.update(
                ADMIN_ID, created.id(), content, null, new EventImageUrls(null, null, null, List.of(second, first))
        );
        assertEquals(List.of(second, first), reordered.detailImageUrls());
        assertTrue(storage.contains(keyOf(first)));

        eventService.update(ADMIN_ID, created.id(), content, null,
                new EventImageUrls(null, null, null, List.of(second)));
        assertFalse(storage.contains(keyOf(first)));
        assertTrue(storage.contains(keyOf(second)));
        eventService.delete(ADMIN_ID, created.id());
        assertFalse(storage.contains(keyOf(second)));
        assertTrue(eventRepository.findById(created.id()).isEmpty());
    }

    @Test
    void keepsImageWhileAnotherSlotStillUsesItAndCanMoveItToDetails() {
        String shared = uploaded(ADMIN_ID);
        AdminEventResult created = eventService.create(ADMIN_ID, content("제목"), null,
                new EventImageUrls(shared, null, null, List.of(shared)));

        eventService.update(ADMIN_ID, created.id(), content("제목"), null,
                new EventImageUrls(shared, null, null, List.of()));
        assertTrue(storage.contains(keyOf(shared)));

        AdminEventResult moved = eventService.update(ADMIN_ID, created.id(), content("제목"), null,
                new EventImageUrls(null, null, null, List.of(shared)));
        assertNull(moved.coverImageUrl());
        assertEquals(List.of(shared), moved.detailImageUrls());
        eventService.delete(ADMIN_ID, created.id());
        assertFalse(storage.contains(keyOf(shared)));
    }

    @Test
    void detailImageClaimFailureRollsBackChangesAndUploadClaim() {
        String current = uploaded(ADMIN_ID);
        String fresh = uploaded(ADMIN_ID);
        String foreign = uploaded(OTHER_ADMIN_ID);
        AdminEventResult created = eventService.create(ADMIN_ID, content("기존"), null,
                new EventImageUrls(null, null, null, List.of(current)));

        assertThrows(BusinessException.class, () -> eventService.update(
                ADMIN_ID, created.id(), content("바뀐 제목"), null,
                new EventImageUrls(null, null, null, List.of(fresh, foreign))
        ));
        assertEquals("기존", eventService.findForAdmin(created.id()).title());
        assertEquals(List.of(current), eventService.findForAdmin(created.id()).detailImageUrls());
        assertTrue(storage.contains(keyOf(current)));
        assertTrue(uploadRepository.findByObjectKey(keyOf(fresh)).isPresent());
    }

    private long publishedWithBanner(String title, LocalDate endsOn, int order) {
        AdminEventResult created = eventService.create(
                ADMIN_ID, content(title), banner(title, endsOn, order), bannerUrls()
        );
        eventService.changeStatus(ADMIN_ID, created.id(), EventStatus.PUBLISHED);
        return created.id();
    }

    private EventImageUrls bannerUrls() {
        return new EventImageUrls(null, uploaded(ADMIN_ID), uploaded(ADMIN_ID));
    }

    private static EventBannerSetting banner(String title, LocalDate endsOn, int order) {
        return new EventBannerSetting(true, title + " 배너", endsOn, order);
    }

    private String uploaded(long adminId) {
        EventImageUploadResult upload = imageService.prepare(adminId, "image/webp", WEBP.length);
        storage.put(keyOf(upload.imageUrl()), new ObjectUpload(
                "image/webp", null, WEBP.length, new ByteArrayInputStream(WEBP)
        ));
        return upload.imageUrl();
    }

    private static String keyOf(String imageUrl) {
        return "public/" + imageUrl.substring("https://cdn.test/assets/".length());
    }

    private static EventContent content(String title) {
        return new EventContent(title, null, "본문", null, null, null, null);
    }

    private void assertNotFound(long eventId) {
        BusinessException exception = assertThrows(BusinessException.class, () -> eventService.findPublic(eventId));
        assertEquals(EventErrorCode.NOT_FOUND, exception.getErrorCode());
    }
}
