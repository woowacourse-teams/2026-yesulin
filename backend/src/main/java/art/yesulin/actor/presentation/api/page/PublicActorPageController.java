package art.yesulin.actor.presentation.api.page;

import art.yesulin.actor.application.page.ActorPageSearchCondition;
import art.yesulin.actor.application.page.ActorPageSort;
import art.yesulin.actor.application.page.PublicActorPagePageResult;
import art.yesulin.actor.application.page.PublicActorPageResult;
import art.yesulin.actor.application.page.PublicActorPageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 배우 목록과 배우 페이지. 비공개 전환이 바로 보여야 하므로 응답을 캐시하지 않는다. */
@RestController
@RequestMapping("/api/v1/public/actor-pages")
@RequiredArgsConstructor
public class PublicActorPageController {

    private final PublicActorPageService publicActorPageService;

    @GetMapping
    public ResponseEntity<PublicActorPagePageResult> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "recent") String sort
    ) {
        ActorPageSearchCondition condition = new ActorPageSearchCondition(ActorPageSort.from(sort));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(publicActorPageService.findPage(condition, page, size));
    }

    @GetMapping("/by-handle/{handle}")
    public ResponseEntity<PublicActorPageResult> findByHandle(@PathVariable String handle) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(publicActorPageService.findByHandle(handle));
    }
}
