package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.AuditionDeletionService;
import art.yesulin.application.audition.AuditionPublicationService;
import art.yesulin.application.audition.AuditionResult;
import art.yesulin.application.audition.AuditionService;
import art.yesulin.application.audition.form.AuditionFormResult;
import art.yesulin.application.audition.form.AuditionFormService;
import art.yesulin.application.audition.query.AuditionManagementQueryService;
import art.yesulin.application.audition.role.AuditionRoleService;
import art.yesulin.application.audition.role.AuditionRolesResult;
import art.yesulin.application.audition.schedule.AuditionScheduleResult;
import art.yesulin.application.audition.schedule.AuditionScheduleService;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auditions")
@RequiredArgsConstructor
@LoginRequired
public class AuditionController {

    private final AuditionService auditionService;
    private final AuditionManagementQueryService auditionManagementQueryService;
    private final AuditionPublicationService auditionPublicationService;
    private final AuditionDeletionService auditionDeletionService;
    private final AuditionRoleService auditionRoleService;
    private final AuditionScheduleService auditionScheduleService;
    private final AuditionFormService auditionFormService;

    @PostMapping
    public ResponseEntity<AuditionResult> create(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody CreateAuditionRequest request
    ) {
        AuditionResult result = auditionService.create(principal.memberId(), request.toCommand());
        URI location = URI.create("/api/v1/auditions/" + result.id());
        return ResponseEntity.created(location).body(result);
    }

    @GetMapping("/{auditionId}")
    public ResponseEntity<AuditionResult> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId
    ) {
        return ResponseEntity.ok(auditionService.find(principal.memberId(), auditionId));
    }

    @GetMapping
    public ResponseEntity<AuditionManagementListResponse> findAll(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @RequestParam long performanceId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String phase
    ) {
        return ResponseEntity.ok(AuditionManagementListResponse.from(
                auditionManagementQueryService.findAuditions(principal.memberId(), performanceId, keyword, phase)
        ));
    }

    @DeleteMapping("/{auditionId}")
    public ResponseEntity<Void> delete(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId
    ) {
        auditionDeletionService.delete(principal.memberId(), auditionId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{auditionId}/basic-information")
    public ResponseEntity<AuditionResult> updateBasicInformation(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @Valid @RequestBody UpdateAuditionBasicInformationRequest request
    ) {
        return ResponseEntity.ok(
                auditionService.updateBasicInformation(principal.memberId(), auditionId, request.toCommand())
        );
    }

    @GetMapping("/{auditionId}/roles")
    public ResponseEntity<AuditionRolesManagementResponse> findRoles(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId
    ) {
        return ResponseEntity.ok(AuditionRolesManagementResponse.from(
                auditionManagementQueryService.findAudition(principal.memberId(), auditionId)
        ));
    }

    @PutMapping("/{auditionId}/roles")
    public ResponseEntity<AuditionRolesResult> saveRoles(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @Valid @RequestBody SaveAuditionRolesRequest request
    ) {
        return ResponseEntity.ok(auditionRoleService.save(principal.memberId(), auditionId, request.toCommand()));
    }

    @GetMapping("/{auditionId}/schedule")
    public ResponseEntity<AuditionScheduleResult> findSchedule(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId
    ) {
        return ResponseEntity.ok(auditionScheduleService.find(principal.memberId(), auditionId));
    }

    @PutMapping("/{auditionId}/schedule")
    public ResponseEntity<AuditionScheduleResult> saveSchedule(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @Valid @RequestBody SaveAuditionScheduleRequest request
    ) {
        return ResponseEntity.ok(auditionScheduleService.save(principal.memberId(), auditionId, request.toCommand()));
    }

    @GetMapping("/{auditionId}/application-form")
    public ResponseEntity<AuditionFormResult> findApplicationForm(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId
    ) {
        return ResponseEntity.ok(auditionFormService.find(principal.memberId(), auditionId));
    }

    @PutMapping("/{auditionId}/application-form")
    public ResponseEntity<AuditionFormResult> saveApplicationForm(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @Valid @RequestBody SaveAuditionFormRequest request
    ) {
        return ResponseEntity.ok(auditionFormService.save(principal.memberId(), auditionId, request.toCommand()));
    }

    @PutMapping("/{auditionId}/publication")
    public ResponseEntity<AuditionResult> publish(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID auditionId
    ) {
        return ResponseEntity.ok(auditionPublicationService.publish(principal.memberId(), auditionId));
    }
}
