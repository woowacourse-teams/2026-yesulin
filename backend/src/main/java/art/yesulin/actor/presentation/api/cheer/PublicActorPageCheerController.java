package art.yesulin.actor.presentation.api.cheer;

import art.yesulin.actor.application.cheer.ActorPageCheerService;
import art.yesulin.actor.application.cheer.ActorPageCheersResult;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 배우 페이지의 응원 글 목록. 로그인했으면 내 글 표시를 함께 주므로 응답을 캐시하지 않는다. */
@RestController
@RequestMapping("/api/v1/public/actor-pages/{publicId}/cheers")
@RequiredArgsConstructor
public class PublicActorPageCheerController {

    private final ActorPageCheerService cheerService;

    @GetMapping
    public ResponseEntity<ActorPageCheersResult> findCheers(
            @PathVariable UUID publicId,
            @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "" + ActorPageCheerService.DEFAULT_SIZE) int size,
            @LoginMember(required = false) MemberPrincipal viewer
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(cheerService.findCheers(publicId, before, size, viewer));
    }
}
