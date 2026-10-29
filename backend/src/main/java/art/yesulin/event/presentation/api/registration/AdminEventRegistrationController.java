package art.yesulin.event.presentation.api.registration;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.event.application.registration.AdminEventRegistrationResult;
import art.yesulin.event.application.registration.BusinessCardArchive;
import art.yesulin.event.application.registration.BusinessCardEntry;
import art.yesulin.event.application.registration.EventRegistrationService;
import art.yesulin.event.domain.registration.EventPaymentStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/** 운영자가 이벤트 참가 신청자를 보고, 명함 자료를 내려받고, 취소 요청 등으로 필요 없는 신청을 지운다. */
@RestController
@RequestMapping("/api/v1/admin/events/{eventId}/registrations")
@RequiredArgsConstructor
@LoginRequired
public class AdminEventRegistrationController {

    private final EventRegistrationService registrationService;
    private final BusinessCardArchive businessCardArchive;

    @GetMapping
    public ResponseEntity<AdminEventRegistrationsResponse> findAll(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long eventId
    ) {
        return ResponseEntity.ok(new AdminEventRegistrationsResponse(registrationService.findAllForAdmin(eventId)));
    }

    /** 명함 희망 배우의 정보(CSV·JSON)와 사진을 zip 하나로 내려받는다. */
    @GetMapping("/business-card-archive")
    public ResponseEntity<StreamingResponseBody> downloadBusinessCards(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long eventId
    ) {
        List<BusinessCardEntry> entries = registrationService.prepareBusinessCardExport(principal.memberId(), eventId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("business-cards-event-%d.zip".formatted(eventId))
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(output -> businessCardArchive.write(entries, output));
    }

    @PatchMapping("/{registrationId}/payment-status")
    public ResponseEntity<AdminEventRegistrationResult> changePaymentStatus(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long eventId,
            @PathVariable long registrationId,
            @Valid @RequestBody PaymentStatusRequest request
    ) {
        return ResponseEntity.ok(registrationService.changePaymentStatus(
                principal.memberId(), eventId, registrationId, request.paymentStatus()));
    }

    public record PaymentStatusRequest(@NotNull EventPaymentStatus paymentStatus) {
    }

    @DeleteMapping("/{registrationId}")
    public ResponseEntity<Void> delete(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long eventId,
            @PathVariable long registrationId
    ) {
        registrationService.delete(principal.memberId(), eventId, registrationId);
        return ResponseEntity.noContent().build();
    }

    public record AdminEventRegistrationsResponse(List<AdminEventRegistrationResult> registrations) {
    }
}
