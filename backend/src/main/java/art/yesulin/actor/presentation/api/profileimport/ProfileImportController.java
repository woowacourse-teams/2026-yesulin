package art.yesulin.actor.presentation.api.profileimport;

import art.yesulin.actor.application.photolibrary.PhotoLibraryItemResult;
import art.yesulin.actor.application.profileimport.PreparedProfileImport;
import art.yesulin.actor.application.profileimport.ProfileImportOverview;
import art.yesulin.actor.application.profileimport.ProfileImportResult;
import art.yesulin.actor.application.profileimport.ProfileImportService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 배우가 자기 PDF 프로필로 편집 화면을 채운다. 결과에는 개인 정보가 담겨 있어 캐시하지 않는다. */
@RestController
@RequestMapping("/api/v1/applicants/me/profile-imports")
@RequiredArgsConstructor
@LoginRequired
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class ProfileImportController {

    private final ProfileImportService profileImportService;

    @GetMapping
    public ResponseEntity<ProfileImportOverview> findCurrent(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(profileImportService.findCurrent(principal.memberId()));
    }

    @PostMapping("/uploads")
    public ResponseEntity<PreparedProfileImport> prepare(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @Valid @RequestBody PrepareProfileImportRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(
                profileImportService.prepare(principal.memberId(), request.originalFilename(), request.size())
        );
    }

    @PostMapping("/{jobId}/completion")
    public ResponseEntity<ProfileImportResult> complete(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable String jobId
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(profileImportService.complete(principal.memberId(), jobId));
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<ProfileImportResult> find(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable String jobId
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(profileImportService.find(principal.memberId(), jobId));
    }

    @PostMapping("/{jobId}/photos")
    public ResponseEntity<PhotoLibraryItemResult> addPhoto(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable String jobId,
            @Valid @RequestBody AddImportedPhotoRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(profileImportService.addPhoto(principal.memberId(), jobId, request.fileKey()));
    }

    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> close(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable String jobId
    ) {
        profileImportService.close(principal.memberId(), jobId);
        return ResponseEntity.noContent().build();
    }
}
