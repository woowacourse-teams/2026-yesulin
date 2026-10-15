package art.yesulin.company.presentation.api.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.company.application.AdminCompanyResult;
import art.yesulin.company.application.editrequest.AdminCompanyEditRequestResult;
import art.yesulin.company.application.editrequest.CompanyEditRequestService;
import art.yesulin.file.application.storage.StoredObjectContent;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 운영자가 공연사 정보 수정 요청을 보고 다듬어 적용하거나 반려한다. */
@RestController
@RequestMapping("/api/v1/admin/company-edit-requests")
@RequiredArgsConstructor
@LoginRequired
public class AdminCompanyEditRequestController {

    private final CompanyEditRequestService editRequestService;

    @GetMapping
    public ResponseEntity<PendingResponse> findPending(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(new PendingResponse(editRequestService.findPending()));
    }

    /** 요청을 보고 운영자가 다듬은 공연사 정보 전체로 고친다. */
    @PostMapping("/{requestId}/apply")
    public ResponseEntity<AdminCompanyResult> apply(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long requestId,
            @Valid @RequestBody ApplyCompanyEditRequest request
    ) {
        return ResponseEntity.ok(editRequestService.apply(
                principal.memberId(), requestId, request.company().toProfile(), request.company().photoUrl(),
                request.useRequestedPhoto(), request.companyUpdatedAt()
        ));
    }

    /** 요청과 함께 온 사진. 적용하기 전이라 공개 주소가 없으므로 운영자에게만 내용을 직접 보낸다. */
    @GetMapping("/{requestId}/photo")
    public ResponseEntity<byte[]> photo(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long requestId
    ) {
        StoredObjectContent photo = editRequestService.findPhoto(requestId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(photo.bytes());
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<Void> reject(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long requestId
    ) {
        editRequestService.reject(principal.memberId(), requestId);
        return ResponseEntity.noContent().build();
    }

    public record PendingResponse(List<AdminCompanyEditRequestResult> requests) {
    }
}
