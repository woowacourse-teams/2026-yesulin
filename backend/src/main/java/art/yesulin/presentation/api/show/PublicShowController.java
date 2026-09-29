package art.yesulin.presentation.api.show;

import art.yesulin.application.file.FileService;
import art.yesulin.application.reservation.ReservationReceiptResult;
import art.yesulin.application.reservation.ReservationService;
import art.yesulin.application.show.PublicShowResult;
import art.yesulin.application.show.PublicShowService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 없는 관객의 공연 조회와 예매. */
@RestController
@RequestMapping("/api/v1/public/shows")
@RequiredArgsConstructor
public class PublicShowController {

    private final PublicShowService publicShowService;
    private final ReservationService reservationService;
    private final FileService fileService;

    @GetMapping
    public ResponseEntity<PublicShowListResponse> findAll() {
        return ResponseEntity.ok(PublicShowListResponse.from(
                publicShowService.findOpenShows(), fileService::readPublicUrl
        ));
    }

    @GetMapping("/{showId}")
    public ResponseEntity<PublicShowResponse> find(@PathVariable UUID showId) {
        PublicShowResult result = publicShowService.find(showId);
        return ResponseEntity.ok(PublicShowResponse.from(
                result, fileId -> fileService.readPublicUrl(result.ownerId(), fileId)
        ));
    }

    @PostMapping("/{showId}/sessions/{sessionId}/reservations")
    public ResponseEntity<ReservationReceiptResult> reserve(
            @PathVariable UUID showId,
            @PathVariable long sessionId,
            @Valid @RequestBody CreateReservationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.reserve(showId, sessionId, request.toCommand()));
    }
}
