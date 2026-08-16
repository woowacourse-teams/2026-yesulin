package art.yesulin.presentation.api.performance;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceRoleResult;
import art.yesulin.application.performance.PerformanceService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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

    @PatchMapping("/{performanceId}/basic-information")
    public ResponseEntity<PerformanceResult> updateBasicInformation(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable long performanceId,
            @Valid @RequestBody UpdatePerformanceBasicInformationRequest request
    ) {
        return ResponseEntity.ok(
                performanceService.updateBasicInformation(principal.memberId(), performanceId, request.toCommand())
        );
    }

    @PostMapping("/{performanceId}/roles")
    public ResponseEntity<PerformanceRoleResult> addRole(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable long performanceId,
            @Valid @RequestBody CreatePerformanceRoleRequest request
    ) {
        PerformanceRoleResult result = performanceService.addRole(
                principal.memberId(), performanceId, request.toCommand()
        );
        URI location = URI.create("/api/v1/performances/%d/roles/%d".formatted(performanceId, result.id()));
        return ResponseEntity.created(location).body(result);
    }

    @PatchMapping("/{performanceId}/roles/{roleId}")
    public ResponseEntity<PerformanceRoleResult> updateRole(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable long performanceId,
            @PathVariable long roleId,
            @Valid @RequestBody UpdatePerformanceRoleRequest request
    ) {
        return ResponseEntity.ok(
                performanceService.updateRole(principal.memberId(), performanceId, roleId, request.toCommand())
        );
    }

    @DeleteMapping("/{performanceId}/roles/{roleId}")
    public ResponseEntity<Void> removeRole(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable long performanceId,
            @PathVariable long roleId
    ) {
        performanceService.removeRole(principal.memberId(), performanceId, roleId);
        return ResponseEntity.noContent().build();
    }
}
