package art.yesulin.company.presentation.api.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.company.application.photo.CompanyPhotoService;
import art.yesulin.company.application.photo.CompanyPhotoUploadResult;
import art.yesulin.company.presentation.api.PrepareCompanyPhotoUploadRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 운영자가 공연사 대표 사진을 브라우저에서 저장소로 바로 올릴 주소를 준다. 공연사를 저장할 때 공개 주소로 확정한다. */
@RestController
@RequestMapping("/api/v1/admin/company-photos")
@RequiredArgsConstructor
@LoginRequired
public class AdminCompanyPhotoController {

    private final CompanyPhotoService photoService;

    @PostMapping("/uploads")
    public ResponseEntity<CompanyPhotoUploadResult> prepareUpload(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody PrepareCompanyPhotoUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                photoService.prepareForAdmin(principal.memberId(), request.contentType(), request.size())
        );
    }
}
