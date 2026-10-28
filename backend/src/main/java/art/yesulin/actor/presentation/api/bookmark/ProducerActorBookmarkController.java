package art.yesulin.actor.presentation.api.bookmark;

import art.yesulin.actor.application.bookmark.ProducerActorBookmarkIdsResult;
import art.yesulin.actor.application.bookmark.ProducerActorBookmarkPageResult;
import art.yesulin.actor.application.bookmark.ProducerActorBookmarkService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 이메일 인증을 마친 공연사가 배우 페이지와 목록 카드에서 관심 배우를 저장하고, 대시보드에서 모아 본다. */
@RestController
@RequestMapping("/api/v1/producers/me")
@RequiredArgsConstructor
@LoginRequired
public class ProducerActorBookmarkController {

    private final ProducerActorBookmarkService bookmarkService;

    @GetMapping("/actor-bookmarks")
    public ResponseEntity<ProducerActorBookmarkPageResult> findPage(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(bookmarkService.findPage(principal.memberId(), page, size));
    }

    @GetMapping("/actor-bookmark-ids")
    public ResponseEntity<ProducerActorBookmarkIdsResult> findSavedIds(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(bookmarkService.findSavedIds(principal.memberId()));
    }

    @PutMapping("/actor-bookmarks/{publicId}")
    public ResponseEntity<Void> save(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID publicId
    ) {
        bookmarkService.save(principal.memberId(), publicId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/actor-bookmarks/{publicId}")
    public ResponseEntity<Void> remove(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID publicId
    ) {
        bookmarkService.remove(principal.memberId(), publicId);
        return ResponseEntity.noContent().build();
    }
}
