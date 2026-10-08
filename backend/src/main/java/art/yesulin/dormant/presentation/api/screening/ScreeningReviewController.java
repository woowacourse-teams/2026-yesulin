package art.yesulin.dormant.presentation.api.screening;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.dormant.application.screening.ScreeningCompletionResult;
import art.yesulin.dormant.application.screening.ScreeningReviewService;
import art.yesulin.dormant.application.screening.ScreeningReviewsResult;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audition-roles/{roleId}")
@RequiredArgsConstructor
@LoginRequired
public class ScreeningReviewController {

    private final ScreeningReviewService screeningReviewService;

    @PatchMapping("/screening-rounds/{round}/reviews")
    public ResponseEntity<ScreeningReviewsResult> save(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long roleId,
            @PathVariable int round,
            @Valid @RequestBody SaveScreeningReviewsRequest request
    ) {
        return ResponseEntity.ok(screeningReviewService.save(principal.memberId(), roleId, round, request.toCommand()));
    }

    @PatchMapping("/screening-rounds/{round}/completion")
    public ResponseEntity<ScreeningCompletionResult> complete(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long roleId,
            @PathVariable int round
    ) {
        return ResponseEntity.ok(screeningReviewService.complete(principal.memberId(), roleId, round));
    }
}
