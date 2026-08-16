package art.yesulin.presentation.api.performance;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.SessionAttribute;

@RestController
@RequestMapping("/api/v1/performances")
@RequiredArgsConstructor
public class PerformanceController {

    private final PerformanceService performanceService;

    @PostMapping
    public ResponseEntity<PerformanceResult> create(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @Valid @RequestBody CreatePerformanceRequest request
    ) {
        PerformanceResult result = performanceService.create(principal.memberId(), request.toCommand());
        return ResponseEntity.created(URI.create("/api/v1/performances/" + result.id())).body(result);
    }

    @PatchMapping("/{performanceId}")
    public ResponseEntity<PerformanceResult> update(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable long performanceId,
            @Valid @RequestBody UpdatePerformanceRequest request
    ) {
        return ResponseEntity.ok(performanceService.update(principal.memberId(), performanceId, request.toCommand()));
    }
}
