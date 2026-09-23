package art.yesulin.presentation.api.otraudition;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.otraudition.OtrAuditionResult;
import art.yesulin.application.otraudition.OtrAuditionService;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/otr-auditions")
@RequiredArgsConstructor
@LoginRequired
public class OtrAuditionController {

    private final OtrAuditionService service;

    @PostMapping
    public ResponseEntity<OtrAuditionResult> create(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody CreateOtrAuditionRequest request
    ) {
        OtrAuditionResult result = service.create(
                principal.memberId(), request.otrId(), request.title(), request.roles(), request.deadline()
        );
        return ResponseEntity.created(URI.create("/api/v1/otr-auditions/" + result.id())).body(result);
    }

    @GetMapping
    public ResponseEntity<OtrAuditionListResponse> findAll(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(new OtrAuditionListResponse(service.findAll(principal.memberId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OtrAuditionResult> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(service.find(principal.memberId(), id));
    }
}
