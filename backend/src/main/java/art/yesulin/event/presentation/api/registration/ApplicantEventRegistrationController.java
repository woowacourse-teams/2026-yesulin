package art.yesulin.event.presentation.api.registration;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.event.application.registration.EventRegistrationService;
import art.yesulin.event.presentation.api.registration.PublicEventRegistrationController.CreatedResponse;
import art.yesulin.event.presentation.api.registration.PublicEventRegistrationController.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applicants/me/events/{eventId}/registrations")
@RequiredArgsConstructor
@LoginRequired
public class ApplicantEventRegistrationController {

    private final EventRegistrationService service;

    @PostMapping
    public ResponseEntity<CreatedResponse> register(
            @LoginMember(roles = MemberType.APPLICANT, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long eventId,
            @Valid @RequestBody RegisterRequest request
    ) {
        long id = service.registerWithProfile(principal.memberId(), eventId, request.toForm(),
                request.photoUploadKey(), request.privacyAgreed());
        return ResponseEntity.status(HttpStatus.CREATED).body(new CreatedResponse(id));
    }
}
