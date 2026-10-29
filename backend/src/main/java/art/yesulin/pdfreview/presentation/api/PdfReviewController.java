package art.yesulin.pdfreview.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.pdfextraction.application.PdfExtractionService.PreparedUpload;
import art.yesulin.pdfreview.application.PdfReviewDetail;
import art.yesulin.pdfreview.application.PdfReviewEntryView;
import art.yesulin.pdfreview.application.PdfReviewProgress;
import art.yesulin.pdfreview.application.PdfReviewProgressService;
import art.yesulin.pdfreview.application.PdfReviewService;
import art.yesulin.pdfreview.application.PdfReviewSummary;
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
public class PdfReviewController {

    private final PdfReviewService service;
    private final PdfReviewProgressService progress;

    @PostMapping
    public ResponseEntity<PdfReviewDetail> create(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody CreatePdfReviewRequest request
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
    public ResponseEntity<PdfReviewDetail> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID reviewId
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.find(principal.memberId(), reviewId.toString()));
    }

    @GetMapping("/{reviewId}/progress")
    public ResponseEntity<PdfReviewProgress> progress(
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
            @Valid @RequestBody PreparePdfReviewUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(service.prepareUpload(principal.memberId(), reviewId.toString(),
                        request.originalFilename(), request.size()));
    }

    @PatchMapping("/{reviewId}/entries/{entryId}")
    public ResponseEntity<PdfReviewEntryView> editEntry(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID reviewId,
            @PathVariable UUID entryId,
            @Valid @RequestBody UpdatePdfReviewEntryRequest request
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.editEntry(principal.memberId(), reviewId.toString(), entryId.toString(),
                        request.memo(), request.decision()));
    }

    @PatchMapping("/{reviewId}/role-assignments")
    public ResponseEntity<List<PdfReviewEntryView>> assignRoles(
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

    public record ReviewsResponse(List<PdfReviewSummary> reviews) {
    }
}
