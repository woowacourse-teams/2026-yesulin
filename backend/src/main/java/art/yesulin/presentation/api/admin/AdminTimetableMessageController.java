package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.AdminTimetableMessageService;
import art.yesulin.application.admin.AdminTimetableMessagesResult;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.timetable.TimetableMessageStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 운영자가 일정표 문자를 직접 보내기 위한 대기열. 받는 번호와 본문이 있으므로 캐시하지 않는다. */
@RestController
@RequestMapping("/api/v1/admin/timetable-messages")
@RequiredArgsConstructor
@LoginRequired
public class AdminTimetableMessageController {

    private final AdminTimetableMessageService messageService;

    @GetMapping
    public ResponseEntity<AdminTimetableMessagesResult> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(defaultValue = "PENDING") TimetableMessageStatus status
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(messageService.find(status));
    }

    @PostMapping("/completion")
    public ResponseEntity<AdminTimetableMessagesResponse> complete(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody CompleteTimetableMessagesRequest request
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new AdminTimetableMessagesResponse(
                messageService.complete(principal.memberId(), request.messageIds())
        ));
    }
}
