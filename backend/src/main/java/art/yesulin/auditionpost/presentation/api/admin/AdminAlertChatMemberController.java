package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.application.AdminAlertChatMembersResult;
import art.yesulin.auditionpost.application.AlertChatMemberService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 운영자가 공고 알림 오픈채팅방 인원을 적는다. 적은 시각부터 올라오는 공고의 공개 조회수 추정치에 쓴다. */
@RestController
@RequestMapping("/api/v1/admin/alert-chat-members")
@RequiredArgsConstructor
@LoginRequired
public class AdminAlertChatMemberController {

    private final AlertChatMemberService alertChatMemberService;

    @GetMapping
    public ResponseEntity<AdminAlertChatMembersResult> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(alertChatMemberService.findForAdmin());
    }

    @PostMapping
    public ResponseEntity<AdminAlertChatMembersResult> record(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody RecordAlertChatMembersRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                alertChatMemberService.record(principal.memberId(), request.memberCount())
        );
    }
}
