package art.yesulin.actor.application.cheer;

import static art.yesulin.actor.domain.cheer.ActorCheerErrorCode.ACTOR_CHEER_NOT_FOUND;

import art.yesulin.actor.domain.cheer.ActorFanNumbers;
import art.yesulin.actor.domain.cheer.ActorPageCheer;
import art.yesulin.actor.domain.cheer.ActorPageCheerRepository;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 활성 일반 회원이 다른 배우의 페이지에 남기는 응원 글. 배우 목록에 보이는 페이지만 받고, 그 밖은 공개 조회처럼 존재 여부를
 * 알 수 없는 404다. 작성자는 익명이며 그 페이지에서 처음 응원한 순서대로 팬 번호만 보인다. 수정·삭제는 작성자만 한다.
 */
@Service
@RequiredArgsConstructor
public class ActorPageCheerService {

    public static final int DEFAULT_SIZE = 10;
    public static final int MAX_SIZE = 30;

    private final ActorPageCheerRepository cheerRepository;
    private final ListedActorPageFinder listedPages;
    private final Clock clock;

    /** 세션이 없어도 읽을 수 있고, 로그인했으면 내 글 표시와 내 상태를 함께 담는다. */
    @Transactional(readOnly = true)
    public ActorPageCheersResult findCheers(UUID publicId, Long before, int size, MemberPrincipal viewer) {
        if (size < 1 || size > MAX_SIZE) {
            throw new IllegalArgumentException("size는 1~%d여야 합니다.".formatted(MAX_SIZE));
        }
        if (before != null && before < 1) {
            throw new IllegalArgumentException("before는 1 이상이어야 합니다.");
        }
        ActorPage page = listedPages.find(publicId);
        List<ActorPageCheer> found = cheerRepository.findVisibleBefore(
                page.getId(), cursorOf(before), PageRequest.of(0, size + 1)
        );
        List<ActorPageCheer> visible = found.subList(0, Math.min(size, found.size()));
        ActorFanNumbers numbers = fanNumbers(page);
        Long nextBefore = nextBefore(found, visible);
        ActorPageParticipant participant = ActorPageParticipant.of(page, viewer);
        return new ActorPageCheersResult(
                cheerRepository.countByActorPageIdAndDeletedAtIsNull(page.getId()),
                visible.stream().map(cheer -> result(cheer, numbers, viewer)).toList(),
                nextBefore,
                new ActorPageCheersResult.Me(participant.loggedIn(), participant.owner(), participant.canParticipate())
        );
    }

    @Transactional
    public ActorPageCheerResult write(MemberPrincipal member, UUID publicId, String body) {
        ActorPage page = listedPages.find(publicId);
        ActorPageCheer cheer = cheerRepository.saveAndFlush(
                ActorPageCheer.write(page, member.memberId(), body, Instant.now(clock))
        );
        return result(cheer, fanNumbers(page), member);
    }

    @Transactional
    public ActorPageCheerResult edit(MemberPrincipal member, UUID publicId, long cheerId, String body) {
        ActorPage page = listedPages.find(publicId);
        ActorPageCheer cheer = find(page, cheerId);
        cheer.edit(member.memberId(), body, Instant.now(clock));
        return result(cheer, fanNumbers(page), member);
    }

    @Transactional
    public void delete(MemberPrincipal member, UUID publicId, long cheerId) {
        ActorPage page = listedPages.find(publicId);
        find(page, cheerId).delete(member.memberId(), Instant.now(clock));
    }

    private ActorPageCheer find(ActorPage page, long cheerId) {
        return cheerRepository.findForUpdate(cheerId, page.getId())
                .orElseThrow(() -> new BusinessException(ACTOR_CHEER_NOT_FOUND, "응원 글을 찾을 수 없어요."));
    }

    private ActorFanNumbers fanNumbers(ActorPage page) {
        return new ActorFanNumbers(cheerRepository.findAuthorsInFirstCheerOrder(page.getId()));
    }

    private static long cursorOf(Long before) {
        if (before == null) {
            return Long.MAX_VALUE;
        }
        return before;
    }

    private static Long nextBefore(List<ActorPageCheer> found, List<ActorPageCheer> visible) {
        if (found.size() == visible.size()) {
            return null;
        }
        return visible.getLast().getId();
    }

    private static ActorPageCheerResult result(ActorPageCheer cheer, ActorFanNumbers numbers, MemberPrincipal viewer) {
        boolean mine = viewer != null && cheer.isWrittenBy(viewer.memberId());
        return new ActorPageCheerResult(
                cheer.getId(), numbers.numberOf(cheer.getAuthorMemberId()), cheer.getBody(), mine,
                cheer.getCreatedAt(), cheer.isEdited()
        );
    }
}
