package art.yesulin.presentation.api.screening;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.file.FileService;
import art.yesulin.application.screening.ScreeningBoardResult;
import art.yesulin.application.screening.ScreeningQueryService;
import art.yesulin.application.screening.ScreeningSubmissionDetailResult;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.SessionAttribute;

@RestController
@RequestMapping("/api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions")
@RequiredArgsConstructor
public class ScreeningSubmissionController {

    private final ScreeningQueryService screeningQueryService;
    private final FileService fileService;

    @GetMapping
    public ResponseEntity<ScreeningBoardResponse> findAll(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable long roleId,
            @PathVariable int round
    ) {
        long ownerId = principal.memberId();
        ScreeningBoardResult result = screeningQueryService.findBoard(ownerId, roleId, round);
        String posterUrl = fileService.readUrl(ownerId, result.performance().posterFileId());
        return ResponseEntity.ok(ScreeningBoardResponse.from(result, posterUrl));
    }

    @GetMapping("/{submissionId}")
    public ResponseEntity<ScreeningSubmissionDetailResponse> find(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable long roleId,
            @PathVariable int round,
            @PathVariable UUID submissionId
    ) {
        long ownerId = principal.memberId();
        ScreeningSubmissionDetailResult result = screeningQueryService.findSubmission(
                ownerId, roleId, round, submissionId
        );
        String posterUrl = fileService.readUrl(ownerId, result.performance().posterFileId());
        return ResponseEntity.ok(ScreeningSubmissionDetailResponse.from(result, posterUrl));
    }
}
