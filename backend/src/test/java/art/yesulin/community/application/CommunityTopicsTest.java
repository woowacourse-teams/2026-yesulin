package art.yesulin.community.application;

import static art.yesulin.community.domain.CommunityTopic.FREE;
import static art.yesulin.community.domain.CommunityTopic.QUESTION;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.community.domain.CommunityAuthorMode;
import art.yesulin.community.domain.CommunityEntry;
import art.yesulin.community.domain.CommunityEntryRepository;
import art.yesulin.community.domain.CommunityLike;
import art.yesulin.community.domain.CommunityLikeRepository;
import art.yesulin.community.domain.CommunityTopic;
import art.yesulin.community.domain.PopularPost;
import art.yesulin.community.domain.PostContent;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:community-topics;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class CommunityTopicsTest {
    private static final Instant NOW = Instant.parse("2026-11-05T03:00:00Z");

    @Autowired
    private CommunityMembershipService members;
    @Autowired
    private CommunityService service;
    @Autowired
    private MemberRepository accounts;
    @Autowired
    private CommunityEntryRepository entries;
    @Autowired
    private CommunityLikeRepository likes;
    @MockitoBean
    private Clock clock;
    private MemberPrincipal actor;

    @BeforeEach
    void setUpActor() {
        when(clock.instant()).thenReturn(NOW);
        actor = MemberPrincipal.from(accounts.save(Member.ofApplicant()));
    }

    @Test
    @DisplayName("주제 기본값과 수정 및 최초 요청의 주제를 보존한다")
    void preservesInitialTopicOnRetry() {
        UUID key = UUID.randomUUID();
        long id = post(key, null).id();
        assertThat(members.post(id, null, null).topic()).isEqualTo(FREE);
        members.editPost(id, null, actor, "바뀐 제목", "본문", QUESTION);
        assertThat(post(key, FREE).topic()).isEqualTo(QUESTION);
        assertThatThrownBy(() -> post(key, QUESTION)).isInstanceOf(BusinessException.class);
        assertThat(members.editPost(id, null, actor, "제목", "본문").topic()).isEqualTo(QUESTION);
    }

    @Test
    @DisplayName("선택한 주제로 다섯 개씩 조회하고 비회원은 다음 페이지를 볼 수 없다")
    void filtersBeforeApplyingCursor() {
        final long oldest = post(UUID.randomUUID(), QUESTION).id();
        for (int i = 0; i < 5; i++) {
            post(UUID.randomUUID(), QUESTION);
            post(UUID.randomUUID(), FREE);
        }
        CommunityPage first = members.posts(Long.MAX_VALUE, null, null, QUESTION);
        assertThat(first.items()).hasSize(5).extracting(EntryResult::topic).containsOnly(QUESTION);
        assertThatThrownBy(() -> members.posts(first.nextCursor(), null, null, QUESTION))
                .isInstanceOf(BusinessException.class);
        var next = members.posts(first.nextCursor(), null, actor, QUESTION);
        assertThat(next.items()).extracting(EntryResult::id).containsExactly(oldest);
        assertThat(next.nextCursor()).isNull();
    }

    @Test
    @DisplayName("최근 칠 일 양끝을 포함하고 삼 점 미만과 삭제된 글을 제외한다")
    void ranksVisiblePostsInsideWindow() {
        Instant cutoff = NOW.minus(7, ChronoUnit.DAYS);
        ranked(cutoff.minusSeconds(1), 9, 1);
        ranked(NOW.plusSeconds(1), 9, 1);
        ranked(NOW, 0, 2);
        ranked(NOW, 1, 0);
        ranked(NOW, 3, 0).delete("owner", NOW);
        long boundary = ranked(cutoff, 0, 3).getId();
        long recent = ranked(NOW, 1, 1).getId();
        long leading = ranked(cutoff, 2, 0).getId();
        assertThat(service.popular()).extracting(PopularPost::id).containsExactly(leading, recent, boundary);
    }

    @Test
    @DisplayName("동점이면 최신 글부터 다섯 개만 제목과 글 번호로 반환한다")
    void limitsTiesToFivePublicTitles() {
        var latest = new java.util.ArrayDeque<PopularPost>();
        for (int i = 0; i < 7; i++) {
            var entry = ranked(NOW, 2, 0);
            latest.addFirst(new PopularPost(entry.getId(), entry.getTitle()));
        }
        assertThat(service.popular()).containsExactlyElementsOf(latest.stream().limit(5).toList());
    }

    private EntryResult post(UUID key, CommunityTopic topic) {
        return members.createPost(actor, key, new PostContent("제목", "본문", topic), CommunityAuthorMode.ANONYMOUS);
    }

    private CommunityEntry ranked(Instant date, int comments, int votes) {
        CommunityEntry post = entries.save(CommunityEntry.post("owner", UUID.randomUUID(), "제목", "본문", date));
        for (int i = 0; i < comments; i++) {
            post.addComment();
        }
        for (int i = 0; i < votes; i++) {
            likes.save(new CommunityLike(post.getId(), Integer.toString(i)));
        }
        return post;
    }
}
