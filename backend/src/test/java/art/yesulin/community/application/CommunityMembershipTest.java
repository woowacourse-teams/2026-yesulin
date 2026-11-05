package art.yesulin.community.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.community.domain.CommunityAuthorMode;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:community-membership;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class CommunityMembershipTest {

    private static final String COOKIE = "a".repeat(64);

    @Autowired
    private CommunityMembershipService members;

    @Autowired
    private CommunityInbox notices;

    @Autowired
    private CommunityService legacy;

    @Autowired
    private MemberRepository accounts;

    @MockitoBean
    private CommunityProfiles profiles;

    @BeforeEach
    void hideProfilesByDefault() {
        when(profiles.find(anyLong())).thenReturn(CommunityProfile.hidden());
    }

    @Test
    void publicProfileUsesCurrentVisibilityAndDoesNotRevealAnonymousPosts() {
        MemberPrincipal author = actor();
        when(profiles.find(author.memberId())).thenReturn(new CommunityProfile("배우", "https://test/photo",
                "/actors/@actor"));
        EntryResult anonymous = post(author);
        EntryResult visible = members.createPost(author, UUID.randomUUID(), "공개", "내용", CommunityAuthorMode.PROFILE);
        assertEquals("배우", visible.author());
        assertEquals("/actors/@actor", visible.authorPath());
        assertEquals("익명1", members.post(anonymous.id(), null, null).author());
        when(profiles.find(author.memberId())).thenReturn(CommunityProfile.hidden());
        EntryResult hidden = members.post(visible.id(), null, null);
        assertEquals("프로필 비공개", hidden.author());
        assertEquals(null, hidden.authorPath());
        assertEquals(null, hidden.authorPhotoUrl());
        when(profiles.find(author.memberId())).thenReturn(new CommunityProfile("새 이름", null, "/actors/@new"));
        assertEquals("새 이름", members.post(visible.id(), null, null).author());
    }

    @Test
    void repliesStayWithTheirPostAndSurviveRemovalOfTheirParent() {
        MemberPrincipal author = actor();
        long post = post(author).id();
        long root = members.createComment(post, author, UUID.randomUUID(), "댓글", CommunityAuthorMode.ANONYMOUS).id();
        UUID request = UUID.randomUUID();
        EntryResult reply = reply(post, root, author, request);
        assertEquals(root, reply.replyToId());
        assertEquals(reply.id(), reply(post, root, author, request).id());
        assertThrows(BusinessException.class, () -> reply(post(author).id(), root, author, UUID.randomUUID()));
        assertThrows(BusinessException.class, () -> reply(post, reply.id(), author, UUID.randomUUID()));
        assertThrows(BusinessException.class, () -> reply(post, null, author, request));
        members.deleteComment(post, root, null, author);
        assertThrows(BusinessException.class, () -> reply(post, root, author, UUID.randomUUID()));
        assertEquals(reply.id(), reply(post, root, author, request).id());
        assertEquals(1, members.post(post, null, null).commentCount());
        assertEquals(root, members.comments(post, 0, null, null).items().getFirst().replyToId());
    }

    private EntryResult reply(long post, Long target, MemberPrincipal author, UUID request) {
        return members.createComment(post, author, request, "답글", CommunityAuthorMode.ANONYMOUS, target);
    }

    @Test
    void eachCommentChoosesItsOwnIdentity() {
        MemberPrincipal author = actor();
        when(profiles.find(author.memberId())).thenReturn(new CommunityProfile("배우", null, "/actors/@actor"));
        long id = post(actor()).id();
        EntryResult publicReply = members.createComment(id, author, UUID.randomUUID(), "공개",
                CommunityAuthorMode.PROFILE);
        assertEquals("배우", publicReply.author());
        assertEquals("익명3", members.createComment(id, actor(), UUID.randomUUID(), "익명",
                CommunityAuthorMode.ANONYMOUS).author());
        EntryResult switched = members.createComment(id, author, UUID.randomUUID(), "변경",
                CommunityAuthorMode.ANONYMOUS);
        assertEquals("익명4", switched.author());
        assertEquals(null, switched.authorPath());
        assertEquals(null, members.participation(author, id).fixedMode());
        long ownPost = post(author).id();
        assertFalse(members.createComment(ownPost, author, UUID.randomUUID(), "공개", CommunityAuthorMode.PROFILE)
                .postAuthor());
    }

    @Test
    void memberOwnsPostAcrossBrowsersButCookieAndOtherAccountCannotManage() {
        MemberPrincipal author = actor();
        assertThrows(BusinessException.class, () -> members.confirmWriter(author, actor().memberId()));
        EntryResult post = post(author);
        assertTrue(members.post(post.id(), null, author).editable());
        assertFalse(members.post(post.id(), COOKIE, actor()).editable());
        assertFalse(legacy.post(post.id(), COOKIE).editable());
        assertThrows(BusinessException.class, () -> members.editPost(post.id(), COOKIE, actor(), "수정", "본문"));
        assertEquals("수정", members.editPost(post.id(), null, author, "수정", "본문").title());
    }

    @Test
    void legacyCookieKeepsRightsRegardlessOfCurrentAccount() {
        EntryResult old = legacy.createPost(COOKIE, UUID.randomUUID(), "기존", "본문");
        assertTrue(members.post(old.id(), COOKIE, actor()).editable());
        assertFalse(members.post(old.id(), null, actor()).editable());
        assertEquals("변경", members.editPost(old.id(), COOKIE, actor(), "변경", "본문").title());
        members.deletePost(old.id(), COOKIE, null);
        assertThrows(BusinessException.class, () -> legacy.post(old.id(), null));
    }

    @Test
    void onlyActiveApplicantsCanCreateAndPublicModeNeedsPublicPage() {
        assertThrows(BusinessException.class, () -> post(null));
        Member producer = accounts.save(Member.ofProducer(UUID.randomUUID() + "@test.invalid", "hash"));
        producer.activate();
        assertThrows(BusinessException.class, () -> post(MemberPrincipal.from(accounts.save(producer))));
        MemberPrincipal actor = actor();
        assertThrows(BusinessException.class, () -> members.createPost(actor, UUID.randomUUID(), "제목", "본문",
                CommunityAuthorMode.PROFILE));
        Member inactive = accounts.findById(actor.memberId()).orElseThrow();
        inactive.deactivate();
        accounts.save(inactive);
        assertThrows(BusinessException.class, () -> post(actor));
    }

    @Test
    void retriesUseAccountAndModeAndDeletedCommentsKeepNumber() {
        MemberPrincipal author = actor();
        long id = post(author).id();
        MemberPrincipal second = actor();
        UUID request = UUID.randomUUID();
        EntryResult reply = members.createComment(id, second, request, "댓글", CommunityAuthorMode.ANONYMOUS);
        assertEquals(reply.id(), members.createComment(id, second, request, "댓글", CommunityAuthorMode.ANONYMOUS).id());
        assertThrows(BusinessException.class, () -> members.createComment(id, actor(), request, "댓글",
                CommunityAuthorMode.ANONYMOUS));
        assertThrows(BusinessException.class, () -> members.createComment(id, second, request, "다른 내용",
                CommunityAuthorMode.ANONYMOUS));
        assertThrows(BusinessException.class, () -> members.createComment(id, second, UUID.randomUUID(), "댓글",
                CommunityAuthorMode.PROFILE));
        members.deleteComment(id, reply.id(), null, second);
        assertEquals("익명2", members.createComment(id, second, UUID.randomUUID(), "다시",
                CommunityAuthorMode.ANONYMOUS).author());
        assertEquals("익명1", members.createComment(id, author, UUID.randomUUID(), "답변",
                CommunityAuthorMode.ANONYMOUS).author());
    }

    @Test
    void concurrentRetriesAndFirstParticipationKeepOneNumber() throws Exception {
        long id = post(actor()).id();
        MemberPrincipal author = actor();
        UUID request = UUID.randomUUID();
        Callable<EntryResult> write = () -> members.createComment(id, author, request, "동시",
                CommunityAuthorMode.ANONYMOUS);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var results = executor.invokeAll(List.of(write, write, write));
            for (var result : results) {
                assertEquals("익명2", result.get().author());
            }
        }
        assertEquals(1, legacy.post(id, null).commentCount());
        assertThrows(BusinessException.class, () -> legacy.deletePost(id, COOKIE));
    }

    @Test
    void concurrentCommentDeletionChangesCountExactlyOnce() throws Exception {
        MemberPrincipal author = actor();
        long id = post(author).id();
        long comment = members.createComment(id, author, UUID.randomUUID(), "삭제", CommunityAuthorMode.ANONYMOUS).id();
        members.createComment(id, author, UUID.randomUUID(), "남김", CommunityAuthorMode.ANONYMOUS);
        var start = new java.util.concurrent.CountDownLatch(1);
        Callable<Boolean> delete = () -> {
            start.await();
            try {
                members.deleteComment(id, comment, null, author);
                return true;
            } catch (BusinessException rejected) {
                return false;
            }
        };
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var results = new java.util.ArrayList<java.util.concurrent.Future<Boolean>>();
            for (int i = 0; i < 8; i++) {
                results.add(executor.submit(delete));
            }
            start.countDown();
            int successes = 0;
            for (var result : results) {
                if (result.get()) {
                    successes++;
                }
            }
            assertEquals(1, successes);
        }
        assertEquals(1, legacy.post(id, null).commentCount());
    }

    @Test
    void guestsCanPreviewFivePostsAndOnlyMembersCanContinue() {
        MemberPrincipal member = actor();
        for (int count = 0; count < 6; count++) {
            post(member);
        }
        CommunityPage preview = members.posts(Long.MAX_VALUE, null, null);
        assertEquals(5, preview.items().size());
        assertThrows(BusinessException.class, () -> members.posts(preview.nextCursor(), null, null));
        assertTrue(members.posts(preview.nextCursor(), null, member).items().getFirst().id() < preview.nextCursor());
    }

    @Test
    void inboxIsPrivateAndRetriesAndSelfRepliesDoNotNotifyTwice() {
        var author = actor();
        var visitor = actor();
        long post = post(author).id();
        UUID key = UUID.randomUUID();
        long comment = reply(post, null, visitor, key).id();
        reply(post, null, visitor, key);
        reply(post, null, author, UUID.randomUUID());
        long nested = reply(post, comment, author, UUID.randomUUID()).id();
        assertEquals(1, notices.recent(author.memberId()).size());
        assertEquals(nested, notices.recent(visitor.memberId()).getFirst().commentId());
        notices.markSeen(visitor.memberId(), comment);
        assertFalse(notices.recent(author.memberId()).getFirst().seen());
        notices.markSeen(author.memberId(), comment);
        assertTrue(notices.recent(author.memberId()).getFirst().seen());
        members.deletePost(post, null, author);
        assertTrue(notices.recent(visitor.memberId()).isEmpty());
    }

    private MemberPrincipal actor() {
        return MemberPrincipal.from(accounts.save(Member.ofApplicant()));
    }

    private EntryResult post(MemberPrincipal author) {
        return members.createPost(author, UUID.randomUUID(), "제목", "본문", CommunityAuthorMode.ANONYMOUS);
    }
}
