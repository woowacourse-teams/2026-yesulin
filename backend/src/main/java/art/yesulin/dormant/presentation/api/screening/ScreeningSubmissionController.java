package art.yesulin.dormant.presentation.api.screening;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.dormant.application.screening.ScreeningBoardResult;
import art.yesulin.dormant.application.screening.ScreeningQueryService;
import art.yesulin.dormant.application.screening.ScreeningSubmissionDetailResult;
import art.yesulin.file.application.FileService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions")
@RequiredArgsConstructor
@LoginRequired
public class ScreeningSubmissionController {

    private final ScreeningQueryService screeningQueryService;
    private final FileService fileService;

    @GetMapping
    public ResponseEntity<ScreeningBoardResponse> findAll(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long roleId,
            @PathVariable int round,
            @ModelAttribute ScreeningFilterRequest filter
    ) {
        ScreeningBoardResult result = screeningQueryService.findBoard(
                principal.memberId(), roleId, round, filter.toCondition()
        );
        String posterUrl = fileService.readPublicUrl(principal.memberId(), result.performance().posterFileId());
        return ResponseEntity.ok(ScreeningBoardResponse.from(result, posterUrl));
    }

    @GetMapping("/{submissionId}")
    public ResponseEntity<ScreeningSubmissionDetailResponse> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long roleId,
            @PathVariable int round,
            @PathVariable UUID submissionId
    ) {
        ScreeningSubmissionDetailResult result = screeningQueryService.findSubmission(
                principal.memberId(), roleId, round, submissionId
        );
        String posterUrl = fileService.readPublicUrl(principal.memberId(), result.performance().posterFileId());
        return ResponseEntity.ok(ScreeningSubmissionDetailResponse.from(result, posterUrl));
    }
}
