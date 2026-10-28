package art.yesulin.actor.presentation.api.admin;

import art.yesulin.actor.application.admin.AdminActorPagePageResult;
import art.yesulin.actor.application.admin.AdminActorPageResult;
import art.yesulin.actor.application.admin.AdminActorPageService;
import art.yesulin.actor.presentation.api.page.ActorPageHandleRequest;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 운영자의 배우 페이지 목록·상세·잠금·아이디 변경. 상세와 변경 응답에는 연락처가 있어 캐시하지 않는다. */
@RestController
@RequestMapping("/api/v1/admin/actor-pages")
@RequiredArgsConstructor
@LoginRequired
public class AdminActorPageController {

    private final AdminActorPageService adminActorPageService;

    @GetMapping
    public ResponseEntity<AdminActorPagePageResult> findAll(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(required = false) String handle,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(adminActorPageService.findPage(handle, page, size));
    }

    @GetMapping("/{publicId}")
    public ResponseEntity<AdminActorPageResult> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID publicId
    ) {
        return noStore(adminActorPageService.find(publicId));
    }

    @PutMapping("/{publicId}/lock")
    public ResponseEntity<AdminActorPageResult> lock(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID publicId,
            @Valid @RequestBody LockActorPageRequest request
    ) {
        return noStore(adminActorPageService.lock(principal.memberId(), publicId, request.reason()));
    }

    @DeleteMapping("/{publicId}/lock")
    public ResponseEntity<AdminActorPageResult> unlock(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID publicId
    ) {
        return noStore(adminActorPageService.unlock(principal.memberId(), publicId));
    }

    @PutMapping("/{publicId}/handle")
    public ResponseEntity<AdminActorPageResult> changeHandle(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID publicId,
            @Valid @RequestBody ActorPageHandleRequest request
    ) {
        return noStore(adminActorPageService.changeHandle(principal.memberId(), publicId, request.handle()));
    }

    private static ResponseEntity<AdminActorPageResult> noStore(AdminActorPageResult result) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result);
    }
}
