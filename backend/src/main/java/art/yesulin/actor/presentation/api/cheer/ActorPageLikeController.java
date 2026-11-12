package art.yesulin.actor.presentation.api.cheer;

import art.yesulin.actor.application.cheer.ActorPageLikeService;
import art.yesulin.actor.application.cheer.ActorPageLikesResult;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인한 배우 계정이 다른 배우의 페이지에 좋아요를 누르고 취소한다. */
@RestController
@RequestMapping("/api/v1/actor-pages/{publicId}/likes")
@RequiredArgsConstructor
@LoginRequired
public class ActorPageLikeController {

    private final ActorPageLikeService likeService;

    @PutMapping
    public ResponseEntity<ActorPageLikesResult> like(
            @LoginMember(roles = MemberType.APPLICANT, statuses = MemberStatus.ACTIVE) MemberPrincipal member,
            @PathVariable UUID publicId
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(likeService.like(member, publicId));
    }

    @DeleteMapping
    public ResponseEntity<ActorPageLikesResult> unlike(
            @LoginMember(roles = MemberType.APPLICANT, statuses = MemberStatus.ACTIVE) MemberPrincipal member,
            @PathVariable UUID publicId
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(likeService.unlike(member, publicId));
    }
}
