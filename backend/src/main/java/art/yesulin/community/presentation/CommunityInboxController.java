package art.yesulin.community.presentation;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.community.application.CommunityInbox;
import art.yesulin.community.application.CommunityNoticeResult;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/community/notifications")
public class CommunityInboxController {

    private final CommunityInbox notices;

    @GetMapping
    public List<CommunityNoticeResult> inbox(@LoginMember MemberPrincipal member, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        return notices.recent(member.memberId());
    }

    @PutMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void readAll(@LoginMember MemberPrincipal member) {
        notices.markAllSeen(member.memberId());
    }

    @PutMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(@LoginMember MemberPrincipal member, @PathVariable long id) {
        notices.markSeen(member.memberId(), id);
    }
}
