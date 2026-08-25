package art.yesulin.presentation.api.producer;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.producer.ProducerProfileResult;
import art.yesulin.application.producer.ProducerProfileService;
import art.yesulin.domain.member.MemberType;
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
