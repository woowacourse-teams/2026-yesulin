package art.yesulin.dormant.presentation.api.auditionnotice;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.dormant.application.auditionnotice.NoticeCommand;
import art.yesulin.dormant.application.auditionnotice.NoticeScope;
import art.yesulin.dormant.application.auditionnotice.NoticeService;
import art.yesulin.dormant.application.auditionnotice.NoticeStore;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@LoginRequired
@RequiredArgsConstructor
@RequestMapping({"/api/v1/audition-roles/{roleId}/screening-rounds/{round}",
        "/api/v1/otr-auditions/{auditionId}/roles/{roleId}/screening-rounds/{round}"})
public class NoticeController {

    private final NoticeService service;

    @GetMapping("/sms-settings")
    public NoticeService.Metadata settings(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable(required = false) UUID auditionId,
            @PathVariable long roleId, @PathVariable int round
    ) {
        return service.metadata(principal.memberId(), new NoticeScope(roleId, auditionId), round);
    }

    @PostMapping("/sms-previews")
    public NoticeService.Preview preview(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable(required = false) UUID auditionId,
            @PathVariable long roleId, @PathVariable int round, @RequestBody NoticeCommand command
    ) {
        return service.preview(principal.memberId(), new NoticeScope(roleId, auditionId), round, command);
    }

    @PostMapping("/sms-batches")
    public ResponseEntity<NoticeStore.Batch> send(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable(required = false) UUID auditionId,
            @PathVariable long roleId, @PathVariable int round, @RequestHeader("Idempotency-Key") UUID key,
            @RequestBody SendRequest request
    ) {
        return ResponseEntity.accepted().body(service.send(principal.memberId(),
                new NoticeScope(roleId, auditionId), round, key,
                request.command(), request.previewToken()));
    }

    @GetMapping("/sms-batches")
    public List<NoticeStore.HistoryItem> history(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable(required = false) UUID auditionId,
            @PathVariable long roleId, @PathVariable int round
    ) {
        return service.history(principal.memberId(), new NoticeScope(roleId, auditionId), round);
    }

    @GetMapping("/sms-batches/{batchId}")
    public NoticeService.Detail detail(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable(required = false) UUID auditionId,
            @PathVariable long roleId, @PathVariable int round, @PathVariable UUID batchId
    ) {
        return service.detail(principal.memberId(), new NoticeScope(roleId, auditionId), round, batchId);
    }

    @GetMapping("/sms-draft")
    public NoticeService.DraftResult draft(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable(required = false) UUID auditionId,
            @PathVariable long roleId, @PathVariable int round
    ) {
        return service.draft(principal.memberId(), new NoticeScope(roleId, auditionId), round);
    }

    @PutMapping("/sms-draft")
    public NoticeService.DraftResult saveDraft(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable(required = false) UUID auditionId,
            @PathVariable long roleId, @PathVariable int round, @RequestBody DraftRequest request
    ) {
        return service.saveDraft(principal.memberId(), new NoticeScope(roleId, auditionId), round,
                request.version(), request.command());
    }

    public record SendRequest(NoticeCommand command, String previewToken) {
    }

    @PostMapping("/sms-batches/{batchId}/retry-preview")
    public NoticeService.Preview retryPreview(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable(required = false) UUID auditionId,
            @PathVariable long roleId, @PathVariable int round, @PathVariable UUID batchId,
            @RequestBody RetryRequest request
    ) {
        return service.retryPreview(principal.memberId(), new NoticeScope(roleId, auditionId), round, batchId,
                request.deliveryIds());
    }

    @PostMapping("/sms-batches/{batchId}/retries")
    public ResponseEntity<NoticeStore.Batch> retry(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable(required = false) UUID auditionId,
            @PathVariable long roleId, @PathVariable int round, @PathVariable UUID batchId,
            @RequestHeader("Idempotency-Key") UUID key, @RequestBody RetryRequest request
    ) {
        return ResponseEntity.accepted().body(service.retry(principal.memberId(),
                new NoticeScope(roleId, auditionId), round, batchId,
                key, request.deliveryIds(), request.previewToken()));
    }

    public record RetryRequest(List<UUID> deliveryIds, String previewToken) {
    }

    public record DraftRequest(long version, NoticeCommand command) {
    }
}
