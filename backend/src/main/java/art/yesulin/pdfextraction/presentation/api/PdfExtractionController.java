package art.yesulin.pdfextraction.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.pdfextraction.application.PdfExtractionService;
import art.yesulin.pdfextraction.application.PdfExtractionView;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pdf-extractions")
@LoginRequired
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionController {

    private final PdfExtractionService service;

    @PostMapping("/uploads")
    public ResponseEntity<PdfExtractionService.PreparedUpload> prepare(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody PreparePdfUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(service.prepare(principal.memberId(), request.originalFilename(), request.size()));
    }

    @PostMapping("/{jobId}/completion")
    public ResponseEntity<PdfExtractionView> complete(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.accepted().cacheControl(CacheControl.noStore())
                .body(service.complete(principal.memberId(), jobId.toString()));
    }

    @GetMapping
    public ResponseEntity<JobsResponse> list(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new JobsResponse(service.list(principal.memberId())));
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<PdfExtractionView> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID jobId,
            @RequestParam(defaultValue = "false") boolean includeResult
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.find(principal.memberId(), jobId.toString(), includeResult));
    }

    public record JobsResponse(List<PdfExtractionView> jobs) {
    }
}
