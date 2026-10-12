package art.yesulin.auditionpost.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.auditionpost.application.AuditionPostEditResult.Attachment;
import art.yesulin.auditionpost.application.AuditionPostImportServiceTest.FakeSource;
import art.yesulin.auditionpost.domain.AuditionPostErrorCode;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.auditionpost.domain.upload.AuditionPostUploadRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.producer.domain.Producer;
import art.yesulin.producer.domain.ProducerRepository;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-post-import;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, AuditionPostImportServiceTest.FakeSourceConfiguration.class})
@RecordApplicationEvents
class AuditionPostOwnerWriteTest {

    private static final long ADMIN_ID = 1L;
    private static final long PRODUCER_ID = 10L;
    private static final long OTHER_PRODUCER_ID = 20L;
    private static final String COMPANY = "극단 예술in";

    @Autowired
    private AuditionPostWriteService writeService;

    @Autowired
    private AuditionPostService auditionPostService;

    @Autowired
    private AuditionPostImportService importService;

    @Autowired
    private AuditionPostUploadService uploadService;

    @Autowired
    private AuditionPostRepository repository;

    @Autowired
    private AuditionPostUploadRepository uploadRepository;

    @Autowired
    private ProducerRepository producerRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private FakeObjectStorage storage;

    @Autowired
    private FakeSource source;

    @Autowired
    private ApplicationEvents events;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        uploadRepository.deleteAll();
        auditLogRepository.deleteAll();
        producerRepository.deleteAll();
        source.reset();
        producerRepository.save(new Producer(PRODUCER_ID, COMPANY, "01012345678"));
        producerRepository.save(new Producer(OTHER_PRODUCER_ID, "다른 극단", "01022223333"));
    }

    @Test
    void producerPostIsPublishedUnderCompanyNameAndAnnounced() {
        String imageUrl = upload(PRODUCER_ID, AuditionPostFileKind.IMAGE, "포스터.png", "image/png");
        String attachmentUrl = upload(PRODUCER_ID, AuditionPostFileKind.ATTACHMENT, "지원서.hwp", "");

        ProducerAuditionPostResult published = writeService.publishByOwner(PRODUCER_ID, command(
                "배우 모집", "<p>지원은 메일로</p><img src=\"" + imageUrl + "\">", List.of(attachmentUrl)
        ));

        assertEquals(AuditionPostStatus.PUBLISHED, published.status());
        AuditionPostEditResult detail = writeService.findOwnedForEdit(PRODUCER_ID, published.id());
        assertEquals(COMPANY, detail.authorName());
        assertEquals("<p>지원은 메일로</p><img src=\"" + imageUrl + "\">", detail.bodyHtml());
        assertEquals(List.of("지원서.hwp"), detail.attachments().stream().map(Attachment::name).toList());
        assertEquals(new AuditionPostEditResult.Owner(PRODUCER_ID, COMPANY), detail.owner());
        assertTrue(auditionPostService.findPublicPost(published.id()) instanceof PublicAuditionPostView.Published);
        assertEquals(
                List.of(new ProducerAuditionPostPublishedEvent(published.id(), COMPANY, "뮤지컬", "배우 모집", "", "상시")),
                events.stream(ProducerAuditionPostPublishedEvent.class).toList()
        );
        AdminAuditionPostResult listed = auditionPostService.findAllForAdmin().getFirst();
        assertEquals(COMPANY, listed.ownerName());
        assertTrue(listed.writtenByOwner());
    }

    @Test
    void producerCannotUseUploadsOfOthers() {
        String adminImage = upload(ADMIN_ID, AuditionPostFileKind.IMAGE, "a.png", "image/png");
        String adminAttachment = upload(ADMIN_ID, AuditionPostFileKind.ATTACHMENT, "a.pdf", "");

        ProducerAuditionPostResult published = writeService.publishByOwner(
                PRODUCER_ID, command("배우 모집", "<img src=\"" + adminImage + "\">", List.of())
        );

        assertEquals("", writeService.findOwnedForEdit(PRODUCER_ID, published.id()).bodyHtml());
        assertCode(AuditionPostErrorCode.INVALID_INPUT, () -> writeService.publishByOwner(
                PRODUCER_ID, command("배우 모집", "<p>본문</p>", List.of(adminAttachment))
        ));
        assertEquals(2, uploadRepository.count());
    }

    @Test
    void producerSeesAndEditsOnlyOwnPosts() {
        long id = writeService.publishByOwner(PRODUCER_ID, command("배우 모집", "<p>본문</p>", List.of())).id();

        assertEquals(List.of(id), writeService.findOwned(PRODUCER_ID).stream().map(ProducerAuditionPostResult::id)
                .toList());
        assertTrue(writeService.findOwned(OTHER_PRODUCER_ID).isEmpty());
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> writeService.findOwnedForEdit(OTHER_PRODUCER_ID, id));
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> writeService.editOwned(
                OTHER_PRODUCER_ID, id, command("가로챈 제목", null, List.of())
        ));
        assertEquals("배우 모집", writeService.findForEdit(id).title());
    }

    @Test
    void ownerEditKeepsAuthorAndAnnouncesOnlyRealChanges() {
        String attachmentUrl = upload(PRODUCER_ID, AuditionPostFileKind.ATTACHMENT, "지원서.hwp", "");
        long id = writeService.publishByOwner(
                PRODUCER_ID, command("배우 모집", "<p>본문</p>", List.of(attachmentUrl))
        ).id();

        writeService.editOwned(PRODUCER_ID, id, command("배우 추가 모집", null, List.of()));
        writeService.editOwned(PRODUCER_ID, id, command("배우 추가 모집", null, List.of()));

        assertEquals(COMPANY, writeService.findOwnedForEdit(PRODUCER_ID, id).authorName());
        assertEquals(
                List.of(new ProducerAuditionPostEditedEvent(
                        id, COMPANY, "배우 추가 모집", List.of(AuditionPostChange.TITLE, AuditionPostChange.ATTACHMENTS)
                )),
                events.stream(ProducerAuditionPostEditedEvent.class).toList()
        );
    }

    @Test
    void adminConnectsImportedPostToProducer() {
        source.post("<p>원문</p>", List.of(), List.of());
        long id = importService.importPost(ADMIN_ID, "22397").post().id();

        AdminAuditionPostResult connected = writeService.changeOwner(ADMIN_ID, id, PRODUCER_ID);

        assertEquals(COMPANY, connected.ownerName());
        assertEquals(List.of(id), writeService.findOwned(PRODUCER_ID).stream().map(ProducerAuditionPostResult::id)
                .toList());
        writeService.editOwned(PRODUCER_ID, id, command("고친 제목", null, List.of()));
        assertEquals("고친 제목", writeService.findForEdit(id).title());
        assertCode(AuditionPostErrorCode.INVALID_INPUT, () -> writeService.changeOwner(ADMIN_ID, id, 999L));

        AdminAuditionPostResult disconnected = writeService.changeOwner(ADMIN_ID, id, null);

        assertNull(disconnected.ownerId());
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> writeService.findOwnedForEdit(PRODUCER_ID, id));
        assertEquals(2, auditLogRepository.findAll().stream()
                .filter(log -> log.getAction() == AdminAction.AUDITION_POST_OWNER_CHANGED).count());
    }

    private String upload(long uploaderId, AuditionPostFileKind kind, String filename, String reportedType) {
        AuditionPostUploadResult prepared = uploadService.prepare(uploaderId, kind, filename, reportedType, 100);
        storage.upload(prepared.url(), prepared.headers().get("Content-Type"), 100);
        return prepared.publicUrl();
    }

    private static AuditionPostWriteCommand command(String title, String bodyHtml, List<String> attachmentUrls) {
        return new AuditionPostWriteCommand(
                "뮤지컬", title, "", "상시", "사칭한 이름", bodyHtml, List.of(), attachmentUrls
        );
    }

    private static void assertCode(AuditionPostErrorCode expected, Executable executable) {
        BusinessException exception = assertThrows(BusinessException.class, executable);
        assertEquals(expected, exception.getErrorCode());
    }
}
