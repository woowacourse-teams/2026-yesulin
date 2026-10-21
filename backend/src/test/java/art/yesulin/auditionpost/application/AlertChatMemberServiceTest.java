package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.alertchat.AlertChatMembers.INITIAL_MEMBER_COUNT;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.auditionpost.application.AdminAlertChatMembersResult.Entry;
import art.yesulin.auditionpost.application.AuditionPostImportServiceTest.FakeSource;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.auditionpost.domain.alertchat.AlertChatMemberCount;
import art.yesulin.auditionpost.domain.alertchat.AlertChatMemberCountRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:alert-chat-members;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import({ObjectStorageTestConfiguration.class, AuditionPostImportServiceTest.FakeSourceConfiguration.class})
class AlertChatMemberServiceTest {

    private static final long ADMIN_ID = 1L;
    private static final String OTR_ID = "22397";
    /** 가짜 원문 공고를 올린 시각(한국 시각 2026-10-04 10:16). */
    private static final Instant POSTED_AT = Instant.parse("2026-10-04T01:16:00Z");

    @Autowired
    private AlertChatMemberService alertChatMemberService;

    @Autowired
    private AuditionPostImportService importService;

    @Autowired
    private AuditionPostService auditionPostService;

    @Autowired
    private AuditionPostCountQuery countQuery;

    @Autowired
    private AlertChatMemberCountRepository countRepository;

    @Autowired
    private AuditionPostRepository postRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private FakeSource source;

    @BeforeEach
    void setUp() {
        countQuery.invalidateAfterCommit();
        postRepository.deleteAll();
        countRepository.deleteAll();
        auditLogRepository.deleteAll();
        source.reset();
    }

    @Test
    void recordsCurrentCountAndShowsHistoryNewestFirst() {
        AdminAlertChatMembersResult before = alertChatMemberService.findForAdmin();
        assertEquals(INITIAL_MEMBER_COUNT, before.currentMemberCount());
        assertTrue(before.history().isEmpty());

        alertChatMemberService.record(ADMIN_ID, 150);
        AdminAlertChatMembersResult after = alertChatMemberService.record(ADMIN_ID, 181);

        assertEquals(181, after.currentMemberCount());
        assertEquals(INITIAL_MEMBER_COUNT, after.initialMemberCount());
        assertEquals(List.of(181, 150), after.history().stream().map(Entry::memberCount).toList());
        List<AdminAuditLog> logs = auditLogRepository.findAll();
        assertEquals(2, logs.size());
        assertTrue(logs.stream().allMatch(log -> log.getAction() == AdminAction.ALERT_CHAT_MEMBERS_RECORDED));
        assertTrue(logs.stream().anyMatch(log -> log.getDetail().endsWith("150명 → 181명")));
    }

    @Test
    void publicPostKeepsCountAtPostingTime() {
        countRepository.save(new AlertChatMemberCount(150, ADMIN_ID, POSTED_AT.minusSeconds(60 * 60)));
        long postId = importService.importPost(ADMIN_ID, OTR_ID).post().id();
        auditionPostService.changeStatus(ADMIN_ID, postId, AuditionPostStatus.PUBLISHED);

        alertChatMemberService.record(ADMIN_ID, 181);

        PublicAuditionPostView view = auditionPostService.findPublicPost(postId);
        PublicAuditionPostPageResult page = auditionPostService.findPublishedPage(0, 12, false, null);
        assertEquals(150, assertInstanceOf(PublicAuditionPostView.Published.class, view).post().alertChatMembers());
        assertEquals(150, page.posts().getFirst().alertChatMembers());
    }

    @Test
    void rejectsCountOutOfRange() {
        assertThrows(BusinessException.class, () -> alertChatMemberService.record(ADMIN_ID, 0));
        assertTrue(countRepository.findAll().isEmpty());
        assertTrue(auditLogRepository.findAll().isEmpty());
    }
}
