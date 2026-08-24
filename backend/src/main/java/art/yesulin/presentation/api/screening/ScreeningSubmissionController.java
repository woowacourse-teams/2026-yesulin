package art.yesulin.presentation.api.screening;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.file.FileService;
import art.yesulin.application.screening.ScreeningBoardResult;
import art.yesulin.application.screening.ScreeningQueryService;
import art.yesulin.application.screening.ScreeningSubmissionDetailResult;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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
            @PathVariable int round
    ) {
        ScreeningBoardResult result = screeningQueryService.findBoard(principal.memberId(), roleId, round);
        String posterUrl = fileService.readUrl(principal.memberId(), result.performance().posterFileId());
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
        String posterUrl = fileService.readUrl(principal.memberId(), result.performance().posterFileId());
        return ResponseEntity.ok(ScreeningSubmissionDetailResponse.from(result, posterUrl));
    }
}
