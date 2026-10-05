package art.yesulin.presentation.api.auditionpost;

import art.yesulin.application.auditionpost.AuditionPostService;
import art.yesulin.application.auditionpost.PublicAuditionPostPageResult;
import art.yesulin.application.auditionpost.PublicAuditionPostResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 없이 보는 공고 목록과 상세. 메인 페이지가 목록을 사용한다. */
@RestController
@RequestMapping("/api/v1/public/audition-posts")
@RequiredArgsConstructor
public class PublicAuditionPostController {

    private final AuditionPostService auditionPostService;

    @GetMapping
    public ResponseEntity<PublicAuditionPostPageResult> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "false") boolean includeClosed
    ) {
        return ResponseEntity.ok(auditionPostService.findPublishedPage(page, size, includeClosed));
    }

    /** 상세 화면이 열릴 때 브라우저가 한 번 보낸다. 서버 렌더링과 메타데이터 조회는 세지 않는다. */
    @PostMapping("/{postId}/views")
    public ResponseEntity<Void> view(@PathVariable long postId) {
        auditionPostService.increaseViewCount(postId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{postId}")
    public ResponseEntity<PublicAuditionPostResult> find(@PathVariable long postId) {
        return ResponseEntity.ok(auditionPostService.findPublishedPost(postId));
    }
}
