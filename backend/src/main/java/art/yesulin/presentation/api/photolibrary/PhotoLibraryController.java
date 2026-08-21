package art.yesulin.presentation.api.photolibrary;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.photolibrary.PhotoLibraryItemResult;
import art.yesulin.application.photolibrary.PhotoLibraryResult;
import art.yesulin.application.photolibrary.PhotoLibraryService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.SessionAttribute;

@RestController
@RequestMapping("/api/v1/applicants/me/photo-library/photos")
@RequiredArgsConstructor
public class PhotoLibraryController {

    private final PhotoLibraryService photoLibraryService;

    @GetMapping
    public ResponseEntity<PhotoLibraryResult> findPhotos(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(photoLibraryService.findPhotos(principal.memberId()));
    }

    @PostMapping
    public ResponseEntity<PhotoLibraryItemResult> addPhoto(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @Valid @RequestBody AddPhotoToLibraryRequest request
    ) {
        PhotoLibraryItemResult result = photoLibraryService.addPhoto(principal.memberId(), request.toCommand());
        URI location = URI.create("/api/v1/applicants/me/photo-library/photos/" + result.id());
        return ResponseEntity.created(location).body(result);
    }
}
