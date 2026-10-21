package art.yesulin.event.presentation.api;

import art.yesulin.event.application.EventBannerResult;
import art.yesulin.event.application.EventService;
import art.yesulin.event.application.PublicEventResult;
import art.yesulin.event.application.PublicEventSummaryResult;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 없이 보는 이벤트 목록·상세와 메인 상단 이벤트 배너. */
@RestController
@RequestMapping("/api/v1/public/events")
@RequiredArgsConstructor
public class PublicEventController {

    private final EventService eventService;

    @GetMapping
    public ResponseEntity<PublicEventsResponse> findAll() {
        return ResponseEntity.ok(new PublicEventsResponse(eventService.findPublished()));
    }

    @GetMapping("/banners")
    public ResponseEntity<EventBannersResponse> findBanners() {
        return ResponseEntity.ok(new EventBannersResponse(eventService.findBanners()));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<PublicEventResult> find(@PathVariable long eventId) {
        return ResponseEntity.ok(eventService.findPublic(eventId));
    }

    public record PublicEventsResponse(List<PublicEventSummaryResult> events) {
    }

    public record EventBannersResponse(List<EventBannerResult> banners) {
    }
}
