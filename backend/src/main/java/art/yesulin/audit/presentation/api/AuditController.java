package art.yesulin.audit.presentation.api;

import art.yesulin.audit.application.AuditApplicantView;
import art.yesulin.audit.application.AuditDetail;
import art.yesulin.audit.application.AuditProgress;
import art.yesulin.audit.application.AuditProgressService;
import art.yesulin.audit.application.AuditService;
import art.yesulin.audit.application.AuditSummary;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.pdfextraction.application.PdfExtractionService.PreparedUpload;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pdf-reviews")
@LoginRequired
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class AuditController {

    private final AuditService service;
    private final AuditProgressService progress;

    @PostMapping
    public ResponseEntity<AuditDetail> create(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody CreateAuditRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(service.create(principal.memberId(), request.title(), request.roles()));
    }

    @GetMapping
    public ResponseEntity<ReviewsResponse> list(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new ReviewsResponse(service.list(principal.memberId())));
    }

    @GetMapping("/{reviewId}")
    public ResponseEntity<AuditDetail> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID reviewId
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.find(principal.memberId(), reviewId.toString()));
    }

    @GetMapping("/{reviewId}/progress")
    public ResponseEntity<AuditProgress> progress(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID reviewId
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(progress.find(principal.memberId(), reviewId.toString()));
    }

    @PostMapping("/{reviewId}/uploads")
    public ResponseEntity<PreparedUpload> prepareUpload(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID reviewId,
            @Valid @RequestBody PrepareAuditUploadRequest request
    ) {
        PreparedUpload upload = service.prepareUpload(principal.memberId(), reviewId.toString(),
                request.originalFilename(), request.size(), request.sha256());
        return ResponseEntity.status(upload.duplicate() ? HttpStatus.OK : HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore()).body(upload);
    }

    @PatchMapping("/{reviewId}/entries/{entryId}")
    public ResponseEntity<AuditApplicantView> editEntry(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID reviewId,
            @PathVariable UUID entryId,
            @Valid @RequestBody UpdateAuditApplicantRequest request
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.editEntry(principal.memberId(), reviewId.toString(), entryId.toString(),
                        request.memo(), request.decision()));
    }

    @PatchMapping("/{reviewId}/role-assignments")
    public ResponseEntity<List<AuditApplicantView>> assignRoles(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID reviewId,
            @Valid @RequestBody AssignRolesRequest request
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.assignRoles(principal.memberId(), reviewId.toString(),
                        request.entryIds().stream().map(UUID::toString).toList(),
                        request.roleId() == null ? null : request.roleId().toString()));
    }

    public record AssignRolesRequest(
            @jakarta.validation.constraints.NotEmpty @jakarta.validation.constraints.Size(max = 300)
            List<@jakarta.validation.constraints.NotNull UUID> entryIds,
            UUID roleId
    ) {
    }

    public record ReviewsResponse(List<AuditSummary> reviews) {
    }
}
