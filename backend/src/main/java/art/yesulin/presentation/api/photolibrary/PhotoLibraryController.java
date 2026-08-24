package art.yesulin.presentation.api.photolibrary;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.photolibrary.PhotoLibraryItemResult;
import art.yesulin.application.photolibrary.PhotoLibraryResult;
import art.yesulin.application.photolibrary.PhotoLibraryService;
import art.yesulin.domain.member.MemberType;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
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

    @DeleteMapping("/{photoId}")
    public ResponseEntity<Void> deletePhoto(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable long photoId
    ) {
        photoLibraryService.deletePhoto(principal.memberId(), photoId);
        return ResponseEntity.noContent().build();
    }
}
