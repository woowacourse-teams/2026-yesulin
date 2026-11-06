package art.yesulin.feedback.presentation.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.feedback.application.AdminFeedbackPage;
import art.yesulin.feedback.application.AdminFeedbackService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 받은 의견 목록. 연락처와 잠깐 열리는 이미지 주소가 있으므로 캐시하지 않는다. */
@Validated
@RestController
@RequestMapping("/api/v1/admin/feedback")
@RequiredArgsConstructor
@LoginRequired
public class AdminFeedbackController {

    private final AdminFeedbackService service;

    @GetMapping
    public ResponseEntity<AdminFeedbackPage> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(defaultValue = "9223372036854775807") @Positive long before
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.find(before));
    }
}
