package art.yesulin.auditionpost.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.auditionpost.application.AuditionPostImportServiceTest.FakeSource;
import art.yesulin.auditionpost.application.AuditionPostOwnerOverview.Owner;
import art.yesulin.auditionpost.application.AuditionPostOwnerOverview.UnlinkedAuthor;
import art.yesulin.auditionpost.domain.AuditionPostErrorCode;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.auditionpost.domain.authorlink.AuditionPostAuthorLinkRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.producer.domain.Producer;
import art.yesulin.producer.domain.ProducerRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-post-import;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, AuditionPostImportServiceTest.FakeSourceConfiguration.class})
class AuditionPostAuthorLinkServiceTest {

    private static final long ADMIN_ID = 1L;
    private static final long PRODUCER_ID = 10L;
    private static final long OTHER_PRODUCER_ID = 20L;
    private static final String COMPANY = "팀플레이예술기획";

    @Autowired
    private AuditionPostAuthorLinkService linkService;

    @Autowired
    private AuditionPostImportService importService;

    @Autowired
    private AuditionPostWriteService writeService;

    @Autowired
    private AuditionPostService auditionPostService;

    @Autowired
    private AuditionPostRepository repository;

    @Autowired
    private AuditionPostAuthorLinkRepository linkRepository;

    @Autowired
    private ProducerRepository producerRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private FakeSource source;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        linkRepository.deleteAll();
        auditLogRepository.deleteAll();
        producerRepository.deleteAll();
        source.reset();
        producerRepository.save(new Producer(PRODUCER_ID, COMPANY, "01012345678"));
        producerRepository.save(new Producer(OTHER_PRODUCER_ID, "다른 극단", "01022223333"));
    }

    @Test
    void linkConnectsExistingAndFutureImportsOfSameAuthor() {
        long first = importBy("22397", "48", "팀플레이");
        long otherOwned = importBy("22398", "48", "팀플레이");
        writeService.changeOwner(ADMIN_ID, otherOwned, OTHER_PRODUCER_ID);
        final long otherAuthor = importBy("22399", "35108", "김현수");
        assertEquals("48", writeService.findForEdit(first).sourceAuthorId());

        AuditionPostAuthorLinkResult linked = linkService.link(ADMIN_ID, "OTR", "48", PRODUCER_ID);

        assertEquals(1, linked.connectedPostCount());
        assertEquals("팀플레이", linked.sourceAuthorName());
        assertEquals(PRODUCER_ID, repository.findById(first).orElseThrow().getOwnerId());
        assertEquals(OTHER_PRODUCER_ID, repository.findById(otherOwned).orElseThrow().getOwnerId());
        assertNull(repository.findById(otherAuthor).orElseThrow().getOwnerId());
        auditionPostService.changeStatus(ADMIN_ID, first, AuditionPostStatus.PUBLISHED);
        assertEquals(COMPANY, ((PublicAuditionPostView.Published) auditionPostService.findPublicPost(first))
                .post().authorName());

        source.author("22400", "48", "팀플레이");
        AdminAuditionPostResult manual = importService.importPost(ADMIN_ID, "22400").post();
        assertEquals(COMPANY, manual.ownerName());
        source.author("22401", "48", "팀플레이");
        long auto = importService.importIfAbsent("OTR", "22401").orElseThrow();
        assertEquals(PRODUCER_ID, repository.findById(auto).orElseThrow().getOwnerId());
        assertEquals(1, auditLogRepository.findAll().stream()
                .filter(log -> log.getAction() == AdminAction.AUDITION_POST_AUTHOR_LINKED).count());
    }

    @Test
    void authorLinkedToAnotherProducerIsRejectedAndSameProducerIsKept() {
        importBy("22397", "48", "팀플레이");
        linkService.link(ADMIN_ID, "OTR", "48", PRODUCER_ID);

        assertCode(AuditionPostErrorCode.AUTHOR_ALREADY_LINKED,
                () -> linkService.link(ADMIN_ID, "OTR", "48", OTHER_PRODUCER_ID));
        assertEquals(0, linkService.link(ADMIN_ID, "OTR", "48", PRODUCER_ID).connectedPostCount());
        assertEquals(1, linkRepository.count());
        assertCode(AuditionPostErrorCode.INVALID_INPUT, () -> linkService.link(ADMIN_ID, "OTR", "99999", PRODUCER_ID));
        assertCode(AuditionPostErrorCode.INVALID_INPUT, () -> linkService.link(ADMIN_ID, "OTR", "48", 999L));
    }

    @Test
    void unlinkStopsFutureLinksButKeepsConnectedPosts() {
        long first = importBy("22397", "48", "팀플레이");
        long linkId = linkService.link(ADMIN_ID, "OTR", "48", PRODUCER_ID).id();

        linkService.unlink(ADMIN_ID, linkId);

        assertEquals(PRODUCER_ID, repository.findById(first).orElseThrow().getOwnerId());
        long next = importBy("22398", "48", "팀플레이");
        assertNull(repository.findById(next).orElseThrow().getOwnerId());
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> linkService.unlink(ADMIN_ID, linkId));
    }

    @Test
    void fillsMissingAuthorIdsAndConnectsLinkedAuthors() {
        final long old = importBy("22390", null, "팀플레이");
        final long gone = importBy("22391", null, "사라진 작성자");
        final long guest = importBy("22392", null, "비회원");
        importBy("22397", "48", "팀플레이");
        linkService.link(ADMIN_ID, "OTR", "48", PRODUCER_ID);
        source.author("22390", "48", "팀플레이");
        source.pageGone("22391");

        AuditionPostAuthorFillResult result = linkService.fillMissingAuthors(null);

        assertEquals(3, result.checked());
        assertEquals(1, result.filled());
        assertEquals(1, result.connected());
        assertEquals(1, result.failed());
        assertNull(result.nextBeforeId());
        assertEquals(2, result.remaining());
        assertEquals("48", repository.findById(old).orElseThrow().getSourceAuthorId());
        assertEquals(PRODUCER_ID, repository.findById(old).orElseThrow().getOwnerId());
        assertNull(repository.findById(gone).orElseThrow().getSourceAuthorId());
        assertNull(repository.findById(guest).orElseThrow().getOwnerId());
    }

    @Test
    void overviewGroupsPostsByProducerAndUnlinkedAuthor() {
        long published = importBy("22397", "48", "팀플레이");
        importBy("22398", "48", "팀플레이(새 닉네임)");
        linkService.link(ADMIN_ID, "OTR", "48", PRODUCER_ID);
        auditionPostService.changeStatus(ADMIN_ID, published, AuditionPostStatus.PUBLISHED);
        importBy("22399", "35108", "김현수");
        importBy("22400", "35108", "김현수");
        importBy("22401", null, "번호 없는 작성자");

        AuditionPostOwnerOverview overview = linkService.findOverview();

        Owner owner = overview.owners().getFirst();
        assertEquals(1, overview.owners().size());
        assertEquals(COMPANY, owner.companyName());
        assertEquals(1, owner.publishedCount());
        assertEquals(1, owner.hiddenCount());
        assertEquals(List.of("48"), owner.authorLinks().stream()
                .map(AuditionPostOwnerOverview.AuthorLink::sourceAuthorId).toList());
        assertEquals(
                List.of(
                        new UnlinkedAuthor(
                                "OTR", "35108", "김현수", 2, overview.unlinkedAuthors().getFirst().latestCreatedAt()
                        ),
                        new UnlinkedAuthor("OTR", null, "번호 없는 작성자", 1,
                                overview.unlinkedAuthors().get(1).latestCreatedAt())
                ),
                overview.unlinkedAuthors()
        );
        assertEquals(1, overview.missingAuthorIdCount());
        assertEquals(List.of(published, published + 1), auditionPostService.findAllForAdmin(PRODUCER_ID).stream()
                .map(AdminAuditionPostResult::id).sorted().toList());
    }

    private long importBy(String otrId, String authorId, String authorName) {
        source.author(otrId, authorId, authorName);
        return importService.importPost(ADMIN_ID, otrId).post().id();
    }

    private static void assertCode(AuditionPostErrorCode expected, Executable executable) {
        BusinessException exception = assertThrows(BusinessException.class, executable);
        assertEquals(expected, exception.getErrorCode());
    }
}
