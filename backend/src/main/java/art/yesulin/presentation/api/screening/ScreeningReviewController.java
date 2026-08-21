package art.yesulin.presentation.api.screening;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.screening.ScreeningReviewService;
import art.yesulin.application.screening.ScreeningReviewsResult;
import art.yesulin.domain.member.MemberType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audition-roles/{roleId}/screening-rounds/{round}/reviews")
@RequiredArgsConstructor
@LoginRequired
public class ScreeningReviewController {

    private final ScreeningReviewService screeningReviewService;

    @PatchMapping
    public ResponseEntity<ScreeningReviewsResult> save(
            @LoginMember(roles = MemberType.PRODUCER) MemberPrincipal principal,
            @PathVariable long roleId,
            @PathVariable int round,
            @Valid @RequestBody SaveScreeningReviewsRequest request
    ) {
        return ResponseEntity.ok(screeningReviewService.save(principal.memberId(), roleId, round, request.toCommand()));
    }
}
