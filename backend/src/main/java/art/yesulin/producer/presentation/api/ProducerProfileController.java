package art.yesulin.producer.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.producer.application.ProducerProfileResult;
import art.yesulin.producer.application.ProducerProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/producers/me")
@RequiredArgsConstructor
@LoginRequired
public class ProducerProfileController {

    private final ProducerProfileService producerProfileService;

    @GetMapping
    public ResponseEntity<ProducerProfileResult> find(
            @LoginMember(roles = MemberType.PRODUCER) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(producerProfileService.find(principal.memberId()));
    }

    @PatchMapping
    public ResponseEntity<ProducerProfileResult> update(
            @LoginMember(roles = MemberType.PRODUCER) MemberPrincipal principal,
            @RequestBody UpdateProducerProfileRequest request
    ) {
        return ResponseEntity.ok(producerProfileService.update(principal.memberId(), request.toCommand()));
    }
}
