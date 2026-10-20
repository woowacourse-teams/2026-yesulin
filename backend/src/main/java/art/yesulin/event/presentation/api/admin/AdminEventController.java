package art.yesulin.event.presentation.api.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.event.application.AdminEventResult;
import art.yesulin.event.application.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 운영자가 이벤트 글을 쓰고 고친 뒤 공개한다. 공개해야 이벤트 화면과 메인 배너에 보인다. */
@RestController
@RequestMapping("/api/v1/admin/events")
@RequiredArgsConstructor
@LoginRequired
public class AdminEventController {

    private final EventService eventService;

    @GetMapping
    public ResponseEntity<AdminEventsResponse> findAll(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(new AdminEventsResponse(eventService.findAllForAdmin()));
    }

    @PostMapping
    public ResponseEntity<AdminEventResult> create(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody WriteEventRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.create(
                principal.memberId(), request.toContent(), request.toBannerSetting(), request.toImageUrls()
        ));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<AdminEventResult> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long eventId
    ) {
        return ResponseEntity.ok(eventService.findForAdmin(eventId));
    }

    @PutMapping("/{eventId}")
    public ResponseEntity<AdminEventResult> update(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long eventId,
            @Valid @RequestBody WriteEventRequest request
    ) {
        return ResponseEntity.ok(eventService.update(
                principal.memberId(), eventId, request.toContent(), request.toBannerSetting(), request.toImageUrls()
        ));
    }

    @PatchMapping("/{eventId}/status")
    public ResponseEntity<AdminEventResult> changeStatus(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long eventId,
            @Valid @RequestBody ChangeEventStatusRequest request
    ) {
        return ResponseEntity.ok(eventService.changeStatus(principal.memberId(), eventId, request.status()));
    }
}
