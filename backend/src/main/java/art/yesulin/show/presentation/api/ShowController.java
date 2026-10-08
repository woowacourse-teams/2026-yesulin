package art.yesulin.show.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.file.application.FileService;
import art.yesulin.show.application.ProducerShowResult;
import art.yesulin.show.application.ShowManagementService;
import art.yesulin.show.application.reservation.ProducerReservationListResult;
import art.yesulin.show.application.reservation.ReservationService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 기획사/제작사가 자기 무료 공연과 회차, 회차별 예매자를 관리한다. */
@RestController
@RequestMapping("/api/v1/shows")
@RequiredArgsConstructor
@LoginRequired
public class ShowController {

    private final ShowManagementService showManagementService;
    private final ReservationService reservationService;
    private final FileService fileService;

    @GetMapping
    public ResponseEntity<ProducerShowListResponse> findAll(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal
    ) {
        long ownerId = principal.memberId();
        return ResponseEntity.ok(ProducerShowListResponse.from(
                showManagementService.findAll(ownerId), fileId -> fileService.readPublicUrl(ownerId, fileId)
        ));
    }

    @PostMapping
    public ResponseEntity<ProducerShowResponse> create(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody SaveShowRequest request
    ) {
        ProducerShowResult result = showManagementService.create(principal.memberId(), request.toCommand());
        return ResponseEntity.created(URI.create("/api/v1/shows/" + result.id())).body(response(result));
    }

    @GetMapping("/{showId}")
    public ResponseEntity<ProducerShowResponse> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID showId
    ) {
        return ResponseEntity.ok(response(showManagementService.find(principal.memberId(), showId)));
    }

    @PutMapping("/{showId}")
    public ResponseEntity<ProducerShowResponse> update(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID showId,
            @Valid @RequestBody SaveShowRequest request
    ) {
        return ResponseEntity.ok(response(
                showManagementService.update(principal.memberId(), showId, request.toCommand())
        ));
    }

    @DeleteMapping("/{showId}")
    public ResponseEntity<Void> delete(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID showId
    ) {
        showManagementService.delete(principal.memberId(), showId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{showId}/opening")
    public ResponseEntity<ProducerShowResponse> open(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID showId
    ) {
        return ResponseEntity.ok(response(showManagementService.open(principal.memberId(), showId)));
    }

    @PostMapping("/{showId}/closing")
    public ResponseEntity<ProducerShowResponse> close(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID showId
    ) {
        return ResponseEntity.ok(response(showManagementService.close(principal.memberId(), showId)));
    }

    @PostMapping("/{showId}/sessions")
    public ResponseEntity<ProducerShowResponse> addSession(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID showId,
            @Valid @RequestBody SaveShowSessionRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(response(
                showManagementService.addSession(principal.memberId(), showId, request.toCommand())
        ));
    }

    @PutMapping("/{showId}/sessions/{sessionId}")
    public ResponseEntity<ProducerShowResponse> updateSession(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID showId,
            @PathVariable long sessionId,
            @Valid @RequestBody SaveShowSessionRequest request
    ) {
        return ResponseEntity.ok(response(showManagementService.updateSession(
                principal.memberId(), showId, sessionId, request.toCommand()
        )));
    }

    @DeleteMapping("/{showId}/sessions/{sessionId}")
    public ResponseEntity<ProducerShowResponse> deleteSession(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID showId,
            @PathVariable long sessionId
    ) {
        return ResponseEntity.ok(response(
                showManagementService.deleteSession(principal.memberId(), showId, sessionId)
        ));
    }

    @GetMapping("/{showId}/sessions/{sessionId}/reservations")
    public ResponseEntity<ProducerReservationListResult> findReservations(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable UUID showId,
            @PathVariable long sessionId
    ) {
        return ResponseEntity.ok(reservationService.findSessionReservations(principal.memberId(), showId, sessionId));
    }

    private ProducerShowResponse response(ProducerShowResult result) {
        return ProducerShowResponse.from(result, fileId -> fileService.readPublicUrl(result.ownerId(), fileId));
    }
}
