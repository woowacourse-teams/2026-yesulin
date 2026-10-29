package art.yesulin.actor.presentation.api.photolibrary;

import art.yesulin.actor.application.photolibrary.PhotoLibraryItemResult;
import art.yesulin.actor.application.photolibrary.PhotoLibraryResult;
import art.yesulin.actor.application.photolibrary.PhotoLibraryService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyUploadResult;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applicants/me/photo-library/photos")
@RequiredArgsConstructor
@LoginRequired
public class PhotoLibraryController {

    private final PhotoLibraryService photoLibraryService;
    private final PhotoPublicCopyService publicCopyService;

    @GetMapping
    public ResponseEntity<PhotoLibraryResult> findPhotos(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(photoLibraryService.findPhotos(principal.memberId()));
    }

    @PostMapping
    public ResponseEntity<PhotoLibraryItemResult> addPhoto(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @Valid @RequestBody AddPhotoToLibraryRequest request
    ) {
        PhotoLibraryItemResult result = photoLibraryService.addPhoto(principal.memberId(), request.toCommand());
        URI location = URI.create("/api/v1/applicants/me/photo-library/photos/" + result.id());
        return ResponseEntity.created(location).body(result);
    }

    @PatchMapping("/{photoId}/representative")
    public ResponseEntity<PhotoLibraryResult> makeRepresentative(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable long photoId
    ) {
        return ResponseEntity.ok(photoLibraryService.makeRepresentative(principal.memberId(), photoId));
    }

    @PatchMapping("/{photoId}")
    public ResponseEntity<PhotoLibraryResult> movePhoto(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable long photoId,
            @Valid @RequestBody MovePhotoRequest request
    ) {
        return ResponseEntity.ok(
                photoLibraryService.movePhoto(principal.memberId(), photoId, request.displayOrder())
        );
    }

    @PatchMapping("/{photoId}/visibility")
    public ResponseEntity<PhotoLibraryResult> changeVisibility(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable long photoId,
            @Valid @RequestBody ChangePhotoVisibilityRequest request
    ) {
        return ResponseEntity.ok(
                photoLibraryService.changeVisibility(principal.memberId(), photoId, request.visibility())
        );
    }

    @PostMapping("/{photoId}/public-copy/upload-requests")
    public ResponseEntity<PhotoPublicCopyUploadResult> preparePublicCopyUpload(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable long photoId,
            @Valid @RequestBody PreparePhotoPublicCopyUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(publicCopyService.prepareUpload(
                principal.memberId(), photoId, request.contentType(), request.size()
        ));
    }

    @PatchMapping("/{photoId}/public-copy/completion")
    public ResponseEntity<PhotoLibraryItemResult> completePublicCopy(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable long photoId,
            @Valid @RequestBody CompletePhotoPublicCopyRequest request
    ) {
        return ResponseEntity.ok(publicCopyService.complete(principal.memberId(), photoId, request.uploadKey()));
    }

    @DeleteMapping("/{photoId}")
    public ResponseEntity<Void> deletePhoto(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable long photoId
    ) {
        photoLibraryService.deletePhoto(principal.memberId(), photoId);
        return ResponseEntity.noContent().build();
    }
}
