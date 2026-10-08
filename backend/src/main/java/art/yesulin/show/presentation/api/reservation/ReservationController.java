package art.yesulin.show.presentation.api.reservation;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.show.application.reservation.ProducerReservationResult;
import art.yesulin.show.application.reservation.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 관객의 전화 요청을 받은 기획사가 자기 공연의 예매를 취소하거나 매수를 바꾸고, 관객별 메모를 남긴다. */
@RestController
@RequestMapping("/api/v1/reservations")
@RequiredArgsConstructor
@LoginRequired
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping("/{reservationId}/cancellation")
    public ResponseEntity<ProducerReservationResult> cancel(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long reservationId
    ) {
        return ResponseEntity.ok(reservationService.cancel(principal.memberId(), reservationId));
    }

    @PutMapping("/{reservationId}/ticket-count")
    public ResponseEntity<ProducerReservationResult> changeTicketCount(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long reservationId,
            @Valid @RequestBody ChangeTicketCountRequest request
    ) {
        return ResponseEntity.ok(reservationService.changeTicketCount(
                principal.memberId(), reservationId, request.ticketCount()
        ));
    }

    @PutMapping("/{reservationId}/memo")
    public ResponseEntity<ProducerReservationResult> updateMemo(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long reservationId,
            @Valid @RequestBody UpdateReservationMemoRequest request
    ) {
        return ResponseEntity.ok(reservationService.updateMemo(principal.memberId(), reservationId, request.memo()));
    }
}
