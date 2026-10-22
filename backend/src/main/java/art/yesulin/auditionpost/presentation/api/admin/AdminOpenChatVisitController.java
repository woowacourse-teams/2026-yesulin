package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.application.AdminOpenChatVisitsResult;
import art.yesulin.auditionpost.application.OpenChatVisitService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/openchat/visits")
@RequiredArgsConstructor
@LoginRequired
public class AdminOpenChatVisitController {

    private final OpenChatVisitService service;

    @GetMapping
    public ResponseEntity<AdminOpenChatVisitsResult> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(defaultValue = "0") int page
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.findForAdmin(page));
    }
}
