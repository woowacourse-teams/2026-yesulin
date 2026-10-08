package art.yesulin.dormant.presentation.api.producer;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.file.FileService;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.dormant.application.audition.query.AuditionManagementQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/producers/me/navigation-tree")
@RequiredArgsConstructor
@LoginRequired
public class ProducerNavigationController {

    private final AuditionManagementQueryService queryService;
    private final FileService fileService;

    @GetMapping
    public ResponseEntity<ProducerNavigationResponse> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal
    ) {
        long ownerId = principal.memberId();
        return ResponseEntity.ok(ProducerNavigationResponse.from(
                queryService.findPerformances(ownerId), fileId -> fileService.readPublicUrl(ownerId, fileId)
        ));
    }
}
