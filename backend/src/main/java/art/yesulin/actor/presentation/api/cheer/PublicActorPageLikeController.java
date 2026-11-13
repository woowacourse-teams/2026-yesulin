package art.yesulin.actor.presentation.api.cheer;

import art.yesulin.actor.application.cheer.ActorPageLikeService;
import art.yesulin.actor.application.cheer.ActorPageLikesResult;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 배우 페이지의 좋아요 수. 로그인했으면 내 상태를 함께 주므로 응답을 캐시하지 않는다. */
@RestController
@RequestMapping("/api/v1/public/actor-pages/{publicId}/likes")
@RequiredArgsConstructor
public class PublicActorPageLikeController {

    private final ActorPageLikeService likeService;

    @GetMapping
    public ResponseEntity<ActorPageLikesResult> findLikes(
            @PathVariable UUID publicId,
            @LoginMember(required = false) MemberPrincipal viewer
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(likeService.findLikes(publicId, viewer));
    }
}
