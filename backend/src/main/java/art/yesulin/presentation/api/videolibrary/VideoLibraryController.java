package art.yesulin.presentation.api.videolibrary;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.videolibrary.VideoLibraryItemResult;
import art.yesulin.application.videolibrary.VideoLibraryResult;
import art.yesulin.application.videolibrary.VideoLibraryService;
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
@RequestMapping("/api/v1/applicants/me/video-library/videos")
@RequiredArgsConstructor
@LoginRequired
public class VideoLibraryController {

    private final VideoLibraryService videoLibraryService;

    @GetMapping
    public ResponseEntity<VideoLibraryResult> findVideos(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(videoLibraryService.findVideos(principal.memberId()));
    }

    @PostMapping
    public ResponseEntity<VideoLibraryItemResult> addVideo(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @Valid @RequestBody AddVideoToLibraryRequest request
    ) {
        VideoLibraryItemResult result = videoLibraryService.addVideo(principal.memberId(), request.toCommand());
        URI location = URI.create("/api/v1/applicants/me/video-library/videos/" + result.id());
        return ResponseEntity.created(location).body(result);
    }

    @PatchMapping("/{videoId}")
    public ResponseEntity<VideoLibraryResult> moveVideo(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable long videoId,
            @Valid @RequestBody MoveVideoRequest request
    ) {
        return ResponseEntity.ok(
                videoLibraryService.moveVideo(principal.memberId(), videoId, request.displayOrder())
        );
    }

    @DeleteMapping("/{videoId}")
    public ResponseEntity<Void> deleteVideo(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable long videoId
    ) {
        videoLibraryService.deleteVideo(principal.memberId(), videoId);
        return ResponseEntity.noContent().build();
    }
}
