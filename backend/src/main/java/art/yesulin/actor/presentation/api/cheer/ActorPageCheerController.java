package art.yesulin.actor.presentation.api.cheer;

import art.yesulin.actor.application.cheer.ActorPageCheerResult;
import art.yesulin.actor.application.cheer.ActorPageCheerService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 활성 일반 회원이 다른 배우의 페이지에 응원 글을 쓰고, 내 글을 고치고 지운다. */
@RestController
@RequestMapping("/api/v1/actor-pages/{publicId}/cheers")
@RequiredArgsConstructor
@LoginRequired
public class ActorPageCheerController {

    private final ActorPageCheerService cheerService;

    @PostMapping
    public ResponseEntity<ActorPageCheerResult> write(
            @LoginMember(roles = MemberType.APPLICANT, statuses = MemberStatus.ACTIVE) MemberPrincipal member,
            @PathVariable UUID publicId,
            @Valid @RequestBody WriteCheerRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore())
                .body(cheerService.write(member, publicId, request.body()));
    }

    @PatchMapping("/{cheerId}")
    public ResponseEntity<ActorPageCheerResult> edit(
            @LoginMember(roles = MemberType.APPLICANT, statuses = MemberStatus.ACTIVE) MemberPrincipal member,
            @PathVariable UUID publicId,
            @PathVariable long cheerId,
            @Valid @RequestBody WriteCheerRequest request
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(cheerService.edit(member, publicId, cheerId, request.body()));
    }

    @DeleteMapping("/{cheerId}")
    public ResponseEntity<Void> delete(
            @LoginMember(roles = MemberType.APPLICANT, statuses = MemberStatus.ACTIVE) MemberPrincipal member,
            @PathVariable UUID publicId,
            @PathVariable long cheerId
    ) {
        cheerService.delete(member, publicId, cheerId);
        return ResponseEntity.noContent().build();
    }
}
