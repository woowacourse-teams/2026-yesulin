package art.yesulin.presentation.api.reservation;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.reservation.ProducerReservationResult;
import art.yesulin.application.reservation.ReservationService;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 관객의 전화 요청을 받은 기획사가 자기 공연의 예매를 취소한다. */
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
}
