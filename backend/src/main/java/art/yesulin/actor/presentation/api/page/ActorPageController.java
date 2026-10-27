package art.yesulin.actor.presentation.api.page;

import art.yesulin.actor.application.page.ActorPageHandleAvailabilityResult;
import art.yesulin.actor.application.page.ActorPageService;
import art.yesulin.actor.application.page.ActorPageSettingsResult;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applicants/me/actor-page")
@RequiredArgsConstructor
@LoginRequired
public class ActorPageController {

    private final ActorPageService actorPageService;

    @GetMapping
    public ResponseEntity<ActorPageSettingsResult> find(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(actorPageService.find(principal.memberId()));
    }

    @GetMapping("/handle-availability")
    public ResponseEntity<ActorPageHandleAvailabilityResult> handleAvailability(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @RequestParam String handle
    ) {
        return ResponseEntity.ok(actorPageService.handleAvailability(principal.memberId(), handle));
    }

    @PutMapping("/handle")
    public ResponseEntity<ActorPageSettingsResult> changeHandle(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @Valid @RequestBody ActorPageHandleRequest request
    ) {
        return ResponseEntity.ok(actorPageService.changeHandle(principal.memberId(), request.handle()));
    }

    @PatchMapping("/visibility")
    public ResponseEntity<ActorPageSettingsResult> changeVisibilities(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @Valid @RequestBody ActorPageVisibilityRequest request
    ) {
        return ResponseEntity.ok(actorPageService.changeVisibilities(principal.memberId(), request.changes()));
    }

    @PutMapping("/publication")
    public ResponseEntity<ActorPageSettingsResult> publish(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @Valid @RequestBody ActorPagePublicationRequest request
    ) {
        return ResponseEntity.ok(
                actorPageService.publish(principal.memberId(), request.agreed(), request.consentVersion())
        );
    }

    @DeleteMapping("/publication")
    public ResponseEntity<ActorPageSettingsResult> unpublish(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(actorPageService.unpublish(principal.memberId()));
    }

    @PostMapping("/publish-prompt")
    public ResponseEntity<Void> recordPublishPrompt(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal
    ) {
        actorPageService.recordPublishPrompt(principal.memberId());
        return ResponseEntity.noContent().build();
    }
}
