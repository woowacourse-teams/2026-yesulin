package art.yesulin.presentation.api.performance;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.file.FileService;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceRoleResult;
import art.yesulin.application.performance.PerformanceService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/performances")
@RequiredArgsConstructor
@LoginRequired
public class PerformanceController {

    private final PerformanceService performanceService;
    private final FileService fileService;

    @PostMapping
    public ResponseEntity<PerformanceResult> create(
            @LoginMember MemberPrincipal principal,
            @Valid @RequestBody CreatePerformanceRequest request
    ) {
        PerformanceResult result = performanceService.create(principal.memberId(), request.toCommand());
        return ResponseEntity.created(URI.create("/api/v1/performances/" + result.id())).body(result);
    }

    @GetMapping
    public ResponseEntity<PerformanceListResponse> findAll(
            @LoginMember MemberPrincipal principal
    ) {
        long ownerId = principal.memberId();
        return ResponseEntity.ok(new PerformanceListResponse(
                performanceService.findAll(ownerId).stream().map(result -> toResponse(ownerId, result)).toList()
        ));
    }

    @GetMapping("/{performanceId}")
    public ResponseEntity<PerformanceResponse> find(
            @LoginMember MemberPrincipal principal,
            @PathVariable long performanceId
    ) {
        long ownerId = principal.memberId();
        return ResponseEntity.ok(toResponse(ownerId, performanceService.find(ownerId, performanceId)));
    }

    @PatchMapping("/{performanceId}/basic-information")
    public ResponseEntity<PerformanceResult> updateBasicInformation(
            @LoginMember MemberPrincipal principal,
            @PathVariable long performanceId,
            @Valid @RequestBody UpdatePerformanceBasicInformationRequest request
    ) {
        return ResponseEntity.ok(
                performanceService.updateBasicInformation(principal.memberId(), performanceId, request.toCommand())
        );
    }

    @PatchMapping("/{performanceId}/poster")
    public ResponseEntity<PerformanceResult> updatePoster(
            @LoginMember MemberPrincipal principal,
            @PathVariable long performanceId,
            @Valid @RequestBody UpdatePerformancePosterRequest request
    ) {
        long ownerId = principal.memberId();
        PerformanceResult result = performanceService.updatePoster(ownerId, performanceId, request.toCommand());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{performanceId}/roles")
    public ResponseEntity<PerformanceRoleResult> addRole(
            @LoginMember MemberPrincipal principal,
            @PathVariable long performanceId,
            @Valid @RequestBody CreatePerformanceRoleRequest request
    ) {
        PerformanceRoleResult result = performanceService.addRole(
                principal.memberId(), performanceId, request.toCommand()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PatchMapping("/{performanceId}/roles/{roleId}")
    public ResponseEntity<PerformanceRoleResult> updateRole(
            @LoginMember MemberPrincipal principal,
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
            @LoginMember MemberPrincipal principal,
            @PathVariable long performanceId,
            @PathVariable long roleId
    ) {
        performanceService.removeRole(principal.memberId(), performanceId, roleId);
        return ResponseEntity.noContent().build();
    }

    private PerformanceResponse toResponse(long ownerId, PerformanceResult result) {
        return PerformanceResponse.from(result, fileService.readUrl(ownerId, result.posterFileId()));
    }
}
