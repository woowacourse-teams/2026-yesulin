package art.yesulin.event.presentation.api.registration;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.event.application.registration.AdminEventRegistrationResult;
import art.yesulin.event.application.registration.EventRegistrationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 운영자가 이벤트 참가 신청자를 보고, 취소 요청 등으로 필요 없는 신청을 지운다. */
@RestController
@RequestMapping("/api/v1/admin/events/{eventId}/registrations")
@RequiredArgsConstructor
@LoginRequired
public class AdminEventRegistrationController {

    private final EventRegistrationService registrationService;

    @GetMapping
    public ResponseEntity<AdminEventRegistrationsResponse> findAll(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long eventId
    ) {
        return ResponseEntity.ok(new AdminEventRegistrationsResponse(registrationService.findAllForAdmin(eventId)));
    }

    @DeleteMapping("/{registrationId}")
    public ResponseEntity<Void> delete(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long eventId,
            @PathVariable long registrationId
    ) {
        registrationService.delete(principal.memberId(), eventId, registrationId);
        return ResponseEntity.noContent().build();
    }

    public record AdminEventRegistrationsResponse(List<AdminEventRegistrationResult> registrations) {
    }
}
