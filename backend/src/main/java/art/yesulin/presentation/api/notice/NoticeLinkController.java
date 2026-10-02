package art.yesulin.presentation.api.notice;

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

@RestController
@RequestMapping("/api/v1/otr")
@RequiredArgsConstructor
public class NoticeLinkController {

    private final OtrNoticeLink noticeLink;

    @GetMapping
    public ResponseEntity<Void> redirect(@RequestParam String vid, HttpServletRequest request) {
        URI destination = noticeLink.destination(vid);
        RequestLogContext.setOtrId(request, vid);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(destination)
                .cacheControl(CacheControl.noStore())
                .header("Referrer-Policy", "no-referrer")
                .build();
    }
}
