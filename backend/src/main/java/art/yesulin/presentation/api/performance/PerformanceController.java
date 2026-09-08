package art.yesulin.presentation.api.performance;

import art.yesulin.application.audition.query.AuditionManagementQueryService;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.file.FileService;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceService;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/performances")
@RequiredArgsConstructor
@LoginRequired
public class PerformanceController {

    private final PerformanceService performanceService;
    private final AuditionManagementQueryService auditionManagementQueryService;
    private final FileService fileService;

    @PostMapping
    public ResponseEntity<PerformanceResponse> create(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody CreatePerformanceRequest request
    ) {
        long ownerId = principal.memberId();
        PerformanceResult result = performanceService.create(ownerId, request.toCommand());
        return ResponseEntity.created(URI.create("/api/v1/performances/" + result.id()))
                .body(toResponse(ownerId, result));
    }

    @GetMapping
    public ResponseEntity<PerformanceListResponse> findAll(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal
    ) {
        long ownerId = principal.memberId();
        return ResponseEntity.ok(new PerformanceListResponse(
                auditionManagementQueryService.findPerformances(ownerId).stream()
                        .map(result -> PerformanceManagementResponse.from(
                                result, fileService.readPublicUrl(ownerId, result.posterFileId())
                        ))
                        .toList()
        ));
    }

    @GetMapping("/{performanceId}")
    public ResponseEntity<PerformanceResponse> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long performanceId
    ) {
        long ownerId = principal.memberId();
        return ResponseEntity.ok(toResponse(ownerId, performanceService.find(ownerId, performanceId)));
    }

    @PutMapping("/{performanceId}")
    public ResponseEntity<PerformanceResponse> update(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long performanceId,
            @Valid @RequestBody UpdatePerformanceRequest request
    ) {
        long ownerId = principal.memberId();
        PerformanceResult result = performanceService.update(ownerId, performanceId, request.toCommand());
        return ResponseEntity.ok(toResponse(ownerId, result));
    }

    @PatchMapping("/{performanceId}/basic-information")
    public ResponseEntity<PerformanceResult> updateBasicInformation(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long performanceId,
            @Valid @RequestBody UpdatePerformanceBasicInformationRequest request
    ) {
        return ResponseEntity.ok(
                performanceService.updateBasicInformation(principal.memberId(), performanceId, request.toCommand())
        );
    }

    @PatchMapping("/{performanceId}/period")
    public ResponseEntity<PerformanceResult> updatePeriod(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long performanceId,
            @Valid @RequestBody UpdatePerformancePeriodRequest request
    ) {
        return ResponseEntity.ok(
                performanceService.updatePeriod(principal.memberId(), performanceId, request.toCommand())
        );
    }

    @PatchMapping("/{performanceId}/poster")
    public ResponseEntity<PerformanceResult> updatePoster(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long performanceId,
            @Valid @RequestBody UpdatePerformancePosterRequest request
    ) {
        long ownerId = principal.memberId();
        PerformanceResult result = performanceService.updatePoster(ownerId, performanceId, request.toCommand());
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{performanceId}")
    public ResponseEntity<Void> delete(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long performanceId
    ) {
        performanceService.delete(principal.memberId(), performanceId);
        return ResponseEntity.noContent().build();
    }

    private PerformanceResponse toResponse(long ownerId, PerformanceResult result) {
        return PerformanceResponse.from(result, fileService.readPublicUrl(ownerId, result.posterFileId()));
    }
}
