package art.yesulin.event.presentation.api.registration;

import art.yesulin.event.application.registration.EventBusinessCardService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/business-cards")
@RequiredArgsConstructor
public class PublicEventBusinessCardController {

    private final EventBusinessCardService service;

    @GetMapping("/{publicId}")
    public ResponseEntity<DestinationResponse> find(@PathVariable String publicId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new DestinationResponse(service.destination(publicId)));
    }

    @GetMapping("/{publicId}/visit")
    public ResponseEntity<DestinationResponse> visit(@PathVariable String publicId, HttpServletRequest request) {
        String destination = "HEAD".equals(request.getMethod())
                ? service.destination(publicId) : service.visit(publicId);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new DestinationResponse(destination));
    }

    public record DestinationResponse(String profileUrl) {
    }
}
