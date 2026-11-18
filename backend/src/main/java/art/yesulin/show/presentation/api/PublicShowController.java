package art.yesulin.show.presentation.api;

import art.yesulin.file.application.FileService;
import art.yesulin.file.application.thumbnail.PosterThumbnails;
import art.yesulin.show.application.PublicShowResult;
import art.yesulin.show.application.PublicShowService;
import art.yesulin.show.application.PublicShowSummaryResult;
import art.yesulin.show.application.reservation.ReservationReceiptResult;
import art.yesulin.show.application.reservation.ReservationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
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
    private final PosterThumbnails thumbnails;

    @GetMapping
    public ResponseEntity<PublicShowListResponse> findAll() {
        List<PublicShowSummaryResult> shows = publicShowService.findPublicShows();
        Map<Long, String> keys = shows.stream().collect(Collectors.toMap(
                PublicShowSummaryResult::posterFileId,
                show -> fileService.readPublicObjectKey(show.ownerId(), show.posterFileId()),
                (first, second) -> first
        ));
        var urls = thumbnails.publicUrls(keys.values());
        return ResponseEntity.ok(PublicShowListResponse.from(shows, (owner, id) -> urls.apply(keys.get(id))));
    }

    @GetMapping("/{showId}")
    public ResponseEntity<PublicShowResponse> find(@PathVariable UUID showId) {
        PublicShowResult result = publicShowService.find(showId);
        return ResponseEntity.ok(PublicShowResponse.from(
                result, fileId -> fileService.readPublicUrl(result.ownerId(), fileId)
        ));
    }

    /** 외부 링크 공연에서 예매하기를 누를 때 화면이 보내는 이동 기록이다. 관객은 바로 외부 예매 페이지로 간다. */
    @PostMapping("/{showId}/external-reservation-visits")
    public ResponseEntity<Void> recordExternalReservationVisit(@PathVariable UUID showId) {
        publicShowService.recordExternalReservationVisit(showId);
        return ResponseEntity.noContent().build();
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
