package art.yesulin.company.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.auditionpost.application.AuditionPostCompanyAuthorOverview;
import art.yesulin.auditionpost.application.AuditionPostCompanyLinkResult;
import art.yesulin.auditionpost.application.AuditionPostCompanyLinkService;
import art.yesulin.auditionpost.application.AuditionPostCompanyProfile;
import art.yesulin.auditionpost.application.AuditionPostService;
import art.yesulin.auditionpost.application.PublicAuditionPostResult;
import art.yesulin.auditionpost.application.PublicAuditionPostView;
import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.AuditionPostOrigin;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.auditionpost.domain.companylink.AuditionPostCompanyLinkRepository;
import art.yesulin.company.domain.CompanyAddress;
import art.yesulin.company.domain.CompanyErrorCode;
import art.yesulin.company.domain.CompanyProfile;
import art.yesulin.company.domain.CompanyStatus;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:company-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class CompanyServiceTest {

    private static final long ADMIN_ID = 1L;
    private static final Instant NOW = Instant.parse("2026-10-15T01:00:00Z");

    @Autowired
    private CompanyService companyService;

    @Autowired
    private AuditionPostService auditionPostService;

    @Autowired
    private AuditionPostRepository postRepository;

    @Autowired
    private AuditionPostCompanyLinkService linkService;

    @Autowired
    private AuditionPostCompanyLinkRepository linkRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @BeforeEach
    void setUp() {
        linkRepository.deleteAll();
        postRepository.deleteAll();
        auditLogRepository.deleteAll();
    }

    @Test
    void showsCompanyOnlyAfterAdminPublishesIt() {
        AdminCompanyResult created = companyService.create(ADMIN_ID, profile());

        assertEquals(CompanyStatus.PENDING, created.status());
        assertNotFound(() -> companyService.findPublic(created.id()));

        companyService.changeStatus(ADMIN_ID, created.id(), CompanyStatus.PUBLISHED);
        PublicCompanyResult company = companyService.findPublic(created.id());

        assertEquals("극단 예술in", company.name());
        assertEquals("서울 종로구", company.location());
        assertEquals("서울 종로구 대학로 12", company.address().roadAddress());
        assertEquals(
                List.of(AdminAction.COMPANY_CREATED, AdminAction.COMPANY_STATUS_CHANGED),
                auditLogRepository.findAll().stream().map(AdminAuditLog::getAction).toList()
        );
    }

    @Test
    void updatesWholeProfileAndClearsOmittedFields() {
        long companyId = companyService.create(ADMIN_ID, profile()).id();

        AdminCompanyResult updated = companyService.update(ADMIN_ID, companyId, new CompanyProfile(
                "극단 새이름", null, false, null, null, null, false, "부산", null, null, null, null
        ));

        assertEquals("극단 새이름", updated.name());
        assertNull(updated.representativeName());
        assertNull(updated.address());
        assertEquals("부산", updated.region());
        assertEquals(AdminAction.COMPANY_EDITED, auditLogRepository.findAll().getLast().getAction());
    }

    @Test
    void attachesSummaryToPostOnlyWhenCompanyIsPublished() {
        long companyId = companyService.create(ADMIN_ID, profile()).id();
        long postId = publishedPost();

        auditionPostService.changeCompany(ADMIN_ID, postId, companyId);

        assertNull(publicPost(postId).company());
        companyService.changeStatus(ADMIN_ID, companyId, CompanyStatus.PUBLISHED);
        CompanySummary summary = publicPost(postId).company();
        assertEquals(companyId, summary.id());
        assertEquals("홍길동", summary.representativeName());
        assertEquals(LocalDate.of(2015, 3, 1), summary.foundedOn());
        assertEquals("서울 종로구", summary.location());

        companyService.changeStatus(ADMIN_ID, companyId, CompanyStatus.HIDDEN);
        assertNull(publicPost(postId).company());
    }

    @Test
    void listsOnlyPublishedPostsOfPublishedCompany() {
        long companyId = companyService.create(ADMIN_ID, profile()).id();
        long published = publishedPost();
        long pending = postRepository.save(post()).getId();
        publishedPost();
        auditionPostService.changeCompany(ADMIN_ID, published, companyId);
        auditionPostService.changeCompany(ADMIN_ID, pending, companyId);

        assertNotFound(() -> auditionPostService.findCompanyPosts(companyId));
        companyService.changeStatus(ADMIN_ID, companyId, CompanyStatus.PUBLISHED);

        assertEquals(
                List.of(published),
                auditionPostService.findCompanyPosts(companyId).stream().map(post -> post.id()).toList()
        );
    }

    @Test
    void recordsLinkChangesOnlyWhenCompanyChanges() {
        long companyId = companyService.create(ADMIN_ID, profile()).id();
        long postId = publishedPost();
        auditLogRepository.deleteAll();

        assertEquals(companyId, auditionPostService.changeCompany(ADMIN_ID, postId, companyId).companyId());
        auditionPostService.changeCompany(ADMIN_ID, postId, companyId);
        assertNull(auditionPostService.changeCompany(ADMIN_ID, postId, null).companyId());

        assertEquals(
                List.of("공연사 %d 연결".formatted(companyId), "공연사 연결 해제"),
                auditLogRepository.findAll().stream().map(AdminAuditLog::getDetail).toList()
        );
        assertThrows(BusinessException.class, () -> auditionPostService.changeCompany(ADMIN_ID, postId, 9999L));
    }

    @Test
    void hidesRepresentativeAndAddressFromPublicUntilConsented() {
        long companyId = companyService.create(ADMIN_ID, new CompanyProfile(
                "극단 예술in", "홍길동", false, null, null,
                new CompanyAddress("서울 마포구 성미산로 1", "101호", "", null, null),
                false, null, null, null, null, "대표 SNS"
        )).id();
        companyService.changeStatus(ADMIN_ID, companyId, CompanyStatus.PUBLISHED);

        PublicCompanyResult company = companyService.findPublic(companyId);

        assertNull(company.representativeName());
        assertNull(company.address());
        assertEquals("서울 마포구", company.location());
        assertEquals("홍길동", companyService.findForAdmin(companyId).representativeName());
    }

    @Test
    void groupsPostsOfSameAuthorIntoOneCompany() {
        long first = otrPost("101", "7001", "극단 하나");
        long repost = otrPost("102", "7001", "극단 하나");
        final long other = otrPost("103", "7002", "극단 둘");
        final long unknown = otrPost("104", null, "극단 셋");

        assertEquals(2, linkService.createCompaniesForUnlinkedAuthors(ADMIN_ID));

        Long companyOfFirst = postRepository.findById(first).orElseThrow().getCompanyId();
        assertEquals(companyOfFirst, postRepository.findById(repost).orElseThrow().getCompanyId());
        assertEquals("극단 하나", companyService.findForAdmin(companyOfFirst).name());
        assertEquals(CompanyStatus.PENDING, companyService.findForAdmin(companyOfFirst).status());
        assertNotEquals(companyOfFirst, postRepository.findById(other).orElseThrow().getCompanyId());
        assertNull(postRepository.findById(unknown).orElseThrow().getCompanyId());
        List<AuditionPostCompanyAuthorOverview.Author> authors = linkService.findOverview().authors();
        assertEquals(List.of("극단 셋", "극단 하나", "극단 둘"), authors.stream().map(author -> author.authorName()).toList());
        assertEquals(2, authors.get(1).postCount());
        assertEquals(companyOfFirst, authors.get(1).companyId());
        assertEquals(1, linkService.findOverview().missingAuthorIdCount());
    }

    @Test
    void movesAuthorPostsWhenAuthorJoinsAnotherCompanyButKeepsManualChoice() {
        final long first = otrPost("201", "8001", "작성자 계정 1");
        long manual = otrPost("202", "8001", "작성자 계정 1");
        long target = companyService.create(ADMIN_ID, CompanyProfile.named("합칠 공연사")).id();
        long other = companyService.create(ADMIN_ID, CompanyProfile.named("다른 공연사")).id();
        linkService.createCompany(ADMIN_ID, "OTR", "8001");
        auditionPostService.changeCompany(ADMIN_ID, manual, other);

        AuditionPostCompanyLinkResult moved = linkService.link(ADMIN_ID, "OTR", "8001", target);

        assertEquals(1, moved.connectedPostCount());
        assertEquals(target, postRepository.findById(first).orElseThrow().getCompanyId());
        assertEquals(other, postRepository.findById(manual).orElseThrow().getCompanyId());
        assertEquals(target, linkRepository.findBySourceAndSourceAuthorId("OTR", "8001").orElseThrow().getCompanyId());
        long later = otrPost("203", "8001", "작성자 계정 1");
        assertEquals(target, linkService.findPostCompany(later).company().id());
    }

    @Test
    void sharesInfoWrittenOnOnePostWithSameAuthor() {
        final long first = otrPost("301", "9001", "극단 같은이");
        final long second = otrPost("302", "9001", "극단 같은이");
        final long stranger = otrPost("303", "9002", "다른 극단");
        assertNull(linkService.findPostCompany(second).company());
        assertEquals("극단 같은이", linkService.findPostCompany(second).suggestedName());

        AdminCompanyResult saved = linkService.savePostCompany(ADMIN_ID, first, profile(), true);

        assertEquals(CompanyStatus.PUBLISHED, saved.status());
        assertEquals(saved.id(), postRepository.findById(second).orElseThrow().getCompanyId());
        assertNull(postRepository.findById(stranger).orElseThrow().getCompanyId());
        long later = otrPost("304", "9001", "극단 같은이");
        AuditionPostCompanyProfile shared = linkService.findPostCompany(later);
        assertEquals(saved.id(), shared.company().id());
        assertTrue(shared.sharedByAuthor());
        assertEquals(saved.id(), linkService.savePostCompany(ADMIN_ID, later, profile(), false).id());
        assertEquals(saved.id(), postRepository.findById(later).orElseThrow().getCompanyId());
    }

    @Test
    void keepsHiddenCompanyHiddenWhenEditedFromPostList() {
        long postId = otrPost("401", "9101", "내린 극단");
        long companyId = linkService.savePostCompany(ADMIN_ID, postId, profile(), true).id();
        companyService.changeStatus(ADMIN_ID, companyId, CompanyStatus.HIDDEN);

        AdminCompanyResult saved = linkService.savePostCompany(ADMIN_ID, postId, profile(), true);

        assertEquals(companyId, saved.id());
        assertEquals(CompanyStatus.HIDDEN, saved.status());
    }

    private PublicAuditionPostResult publicPost(long postId) {
        return assertInstanceOf(PublicAuditionPostView.Published.class, auditionPostService.findPublicPost(postId))
                .post();
    }

    private long publishedPost() {
        AuditionPost post = post();
        post.changeStatus(AuditionPostStatus.PUBLISHED);
        return postRepository.save(post).getId();
    }

    private long otrPost(String externalId, String authorId, String authorName) {
        AuditionPostContent content = new AuditionPostContent("연극", "공고", "", "상시", authorName, null, "<p>본문</p>");
        AuditionPost post = new AuditionPost(
                new AuditionPostOrigin("OTR", externalId, "https://otr.co.kr/audition/?vid=" + externalId),
                content, List.of(), List.of(), ADMIN_ID, NOW
        );
        if (authorId != null) {
            post.recordSourceAuthor(authorId);
        }
        return postRepository.save(post).getId();
    }

    private static AuditionPost post() {
        AuditionPostContent content = new AuditionPostContent("연극", "공고", "", "상시", "", null, "<p>본문</p>");
        return AuditionPost.write(content, List.of(), List.of(), ADMIN_ID, NOW);
    }

    private static CompanyProfile profile() {
        return new CompanyProfile(
                "극단 예술in", "홍길동", true, List.of("https://yesulin.art"), LocalDate.of(2015, 3, 1),
                new CompanyAddress(
                        "서울 종로구 대학로 12", "3층", "03086", new BigDecimal("37.5822000"), new BigDecimal("127.0017000")
                ),
                true, null, "02-765-4321", "대학로 소극장 중심의 창작 극단", "2015 창단", "홈페이지 연혁"
        );
    }

    private static void assertNotFound(org.junit.jupiter.api.function.Executable executable) {
        BusinessException exception = assertThrows(BusinessException.class, executable);
        assertEquals(CompanyErrorCode.NOT_FOUND, exception.getErrorCode());
    }
}
