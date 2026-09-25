package art.yesulin.presentation.api.otraudition;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.otraudition.OtrScreeningService;
import art.yesulin.application.screening.ScreeningBoardResult;
import art.yesulin.application.screening.ScreeningCompletionResult;
import art.yesulin.application.screening.ScreeningReviewsResult;
import art.yesulin.application.screening.ScreeningSubmissionDetailResult;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.presentation.api.screening.SaveScreeningReviewsRequest;
import art.yesulin.presentation.api.screening.ScreeningBoardResponse;
import art.yesulin.presentation.api.screening.ScreeningFilterRequest;
import art.yesulin.presentation.api.screening.ScreeningSubmissionDetailResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/otr-auditions/{auditionId}/roles/{roleOrder}/screening-rounds/{round}")
@RequiredArgsConstructor
@LoginRequired
public class OtrScreeningController {

    private final OtrScreeningService service;

    @GetMapping("/submissions")
    public ResponseEntity<ScreeningBoardResponse> findAll(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @PathVariable int roleOrder,
            @PathVariable int round,
            @ModelAttribute ScreeningFilterRequest filter
    ) {
        ScreeningBoardResult result = service.findBoard(principal.memberId(), auditionId, roleOrder,
                round, filter.toCondition());
        return ResponseEntity.ok(new ScreeningBoardResponse(
                new ScreeningBoardResponse.Performance(0, "", result.performance().title()),
                result.posting(), result.role(), result.round(), result.rounds(), result.submissions()));
    }

    @GetMapping("/submissions/{submissionId}")
    public ResponseEntity<ScreeningSubmissionDetailResponse> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @PathVariable int roleOrder,
            @PathVariable int round,
            @PathVariable UUID submissionId
    ) {
        ScreeningSubmissionDetailResult result = service.findSubmission(principal.memberId(), auditionId,
                roleOrder, round, submissionId);
        return ResponseEntity.ok(new ScreeningSubmissionDetailResponse(
                new ScreeningBoardResponse.Performance(0, "", result.performance().title()),
                result.posting(), result.role(), result.round(), result.rounds(), result.submission()));
    }

    @PatchMapping("/reviews")
    public ResponseEntity<ScreeningReviewsResult> save(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @PathVariable int roleOrder,
            @PathVariable int round,
            @Valid @RequestBody SaveScreeningReviewsRequest request
    ) {
        return ResponseEntity.ok(service.save(principal.memberId(), auditionId, roleOrder,
                round, request.toCommand()));
    }

    @PatchMapping("/completion")
    public ResponseEntity<ScreeningCompletionResult> complete(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @PathVariable int roleOrder,
            @PathVariable int round
    ) {
        return ResponseEntity.ok(service.complete(principal.memberId(), auditionId, roleOrder, round));
    }
}
