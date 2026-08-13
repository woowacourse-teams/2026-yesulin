package art.yesulin.presentation.screening;

import art.yesulin.application.screening.ScreeningBoardResult;
import art.yesulin.application.screening.ScreeningService;
import art.yesulin.infrastructure.security.ActiveCompanySession;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/roles/{roleId}/screening-rounds")
public class ScreeningController {

    private final ScreeningService screeningService;

    public ScreeningController(ScreeningService screeningService) {
        this.screeningService = screeningService;
    }

    @GetMapping("/current/applications")
    public ScreeningBoardResult board(
            @PathVariable long roleId,
            HttpSession session) {
        return screeningService.board(ActiveCompanySession.require(session), roleId, null);
    }

    @GetMapping("/{round}/applications")
    public ScreeningBoardResult board(
            @PathVariable long roleId,
            @PathVariable int round,
            HttpSession session) {
        return screeningService.board(ActiveCompanySession.require(session), roleId, round);
    }

    @PatchMapping("/{round}/reviews")
    public ScreeningBoardResult review(
            @PathVariable long roleId,
            @PathVariable int round,
            @Valid @RequestBody ScreeningReviewRequest request,
            HttpSession session) {
        return screeningService.review(
                ActiveCompanySession.require(session), request.toCommand(roleId, round));
    }

    @PatchMapping("/{round}")
    public ScreeningBoardResult closeRound(
            @PathVariable long roleId,
            @PathVariable int round,
            @Valid @RequestBody CloseRoundRequest request,
            HttpSession session) {
        if (!"CLOSED".equals(request.status())) {
            throw new art.yesulin.application.screening.ScreeningException(
                    "INVALID_ROUND_STATUS", "차수 상태는 CLOSED로만 변경할 수 있습니다.");
        }
        return screeningService.closeRound(
                ActiveCompanySession.require(session), roleId, round);
    }
}
