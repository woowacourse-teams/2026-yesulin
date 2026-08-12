package art.yesulin.presentation.recruitment;

import art.yesulin.application.recruitment.PerformanceResult;
import art.yesulin.application.recruitment.PostingResult;
import art.yesulin.application.recruitment.RecruitmentService;
import art.yesulin.application.recruitment.RoleResult;
import art.yesulin.infrastructure.security.ActiveCompanySession;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RecruitmentController {

    private final RecruitmentService recruitmentService;

    public RecruitmentController(RecruitmentService recruitmentService) {
        this.recruitmentService = recruitmentService;
    }

    @PostMapping("/api/v1/performances")
    @ResponseStatus(HttpStatus.CREATED)
    public PerformanceResult createPerformance(
            @Valid @RequestBody PerformanceRequest request, HttpSession session) {
        return recruitmentService.createPerformance(
                ActiveCompanySession.require(session), request.toCommand());
    }

    @GetMapping("/api/v1/performances")
    public List<PerformanceResult> performances(HttpSession session) {
        return recruitmentService.performances(ActiveCompanySession.require(session));
    }

    @GetMapping("/api/v1/performances/{performanceId}")
    public PerformanceResult performance(
            @PathVariable long performanceId, HttpSession session) {
        return recruitmentService.performance(
                ActiveCompanySession.require(session), performanceId);
    }

    @PatchMapping("/api/v1/performances/{performanceId}")
    public PerformanceResult updatePerformance(
            @PathVariable long performanceId,
            @Valid @RequestBody PerformanceRequest request,
            HttpSession session) {
        return recruitmentService.updatePerformance(
                ActiveCompanySession.require(session), performanceId, request.toCommand());
    }

    @DeleteMapping("/api/v1/performances/{performanceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePerformance(@PathVariable long performanceId, HttpSession session) {
        recruitmentService.deletePerformance(
                ActiveCompanySession.require(session), performanceId);
    }

    @PostMapping("/api/v1/performances/{performanceId}/postings")
    @ResponseStatus(HttpStatus.CREATED)
    public PostingResult createPosting(
            @PathVariable long performanceId,
            @Valid @RequestBody PostingRequest request,
            HttpSession session) {
        return recruitmentService.createPosting(
                ActiveCompanySession.require(session), performanceId, request.toCommand());
    }

    @GetMapping("/api/v1/performances/{performanceId}/postings")
    public List<PostingResult> postings(
            @PathVariable long performanceId, HttpSession session) {
        return recruitmentService.postings(
                ActiveCompanySession.require(session), performanceId);
    }

    @GetMapping("/api/v1/postings/{postingId}")
    public PostingResult posting(@PathVariable long postingId, HttpSession session) {
        return recruitmentService.posting(ActiveCompanySession.require(session), postingId);
    }

    @PatchMapping("/api/v1/postings/{postingId}")
    public PostingResult updatePosting(
            @PathVariable long postingId,
            @Valid @RequestBody PostingRequest request,
            HttpSession session) {
        return recruitmentService.updatePosting(
                ActiveCompanySession.require(session), postingId, request.toCommand());
    }

    @DeleteMapping("/api/v1/postings/{postingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePosting(@PathVariable long postingId, HttpSession session) {
        recruitmentService.deletePosting(ActiveCompanySession.require(session), postingId);
    }

    @PostMapping("/api/v1/postings/{postingId}/roles")
    @ResponseStatus(HttpStatus.CREATED)
    public RoleResult createRole(
            @PathVariable long postingId,
            @Valid @RequestBody RoleRequest request,
            HttpSession session) {
        return recruitmentService.createRole(
                ActiveCompanySession.require(session), postingId, request.toCommand());
    }

    @GetMapping("/api/v1/postings/{postingId}/roles")
    public List<RoleResult> roles(@PathVariable long postingId, HttpSession session) {
        return recruitmentService.roles(ActiveCompanySession.require(session), postingId);
    }
}
