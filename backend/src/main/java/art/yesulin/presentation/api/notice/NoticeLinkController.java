package art.yesulin.presentation.api.notice;

import art.yesulin.application.auditionpost.AuditionPostService;
import art.yesulin.application.notice.OtrNoticeLink;
import art.yesulin.presentation.config.RequestLogContext;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 공고 알림 링크. 예술in에 게시한 공고면 우리 상세로, 아니면 OTR 원문으로 보낸다. */
@RestController
@RequestMapping("/api/v1/otr")
@RequiredArgsConstructor
public class NoticeLinkController {

    private final OtrNoticeLink noticeLink;
    private final AuditionPostService auditionPostService;

    @GetMapping
    public ResponseEntity<Void> redirect(@RequestParam String vid, HttpServletRequest request) {
        URI original = noticeLink.destination(vid);
        RequestLogContext.setOtrId(request, vid);
        URI destination = auditionPostService.findPublishedId(OtrNoticeLink.SOURCE, vid)
                .map(postId -> URI.create("/posts/" + postId))
                .orElse(original);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(destination)
                .cacheControl(CacheControl.noStore())
                .header("Referrer-Policy", "no-referrer")
                .build();
    }
}
