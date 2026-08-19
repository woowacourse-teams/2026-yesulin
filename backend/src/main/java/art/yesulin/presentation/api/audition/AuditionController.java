package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.AuditionResult;
import art.yesulin.application.audition.AuditionService;
import art.yesulin.application.auth.MemberPrincipal;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.SessionAttribute;

@RestController
@RequestMapping("/api/v1/auditions")
@RequiredArgsConstructor
public class AuditionController {

    private final AuditionService auditionService;

    @PostMapping
    public ResponseEntity<AuditionResult> create(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @Valid @RequestBody CreateAuditionRequest request
    ) {
        AuditionResult result = auditionService.create(principal.memberId(), request.toCommand());
        URI location = URI.create("/api/v1/auditions/" + result.id());
        return ResponseEntity.created(location).body(result);
    }

    @GetMapping("/{auditionId}")
    public ResponseEntity<AuditionResult> find(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable long auditionId
    ) {
        return ResponseEntity.ok(auditionService.find(principal.memberId(), auditionId));
    }

    @PutMapping("/{auditionId}/basic-information")
    public ResponseEntity<AuditionResult> updateBasicInformation(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable long auditionId,
            @Valid @RequestBody UpdateAuditionBasicInformationRequest request
    ) {
        return ResponseEntity.ok(
                auditionService.updateBasicInformation(principal.memberId(), auditionId, request.toCommand())
        );
    }
}
