package art.yesulin.company.presentation.api.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.company.application.kopis.KopisCompanySearchResult;
import art.yesulin.company.application.kopis.KopisCompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 운영자가 공연사 정보를 쓸 때 KOPIS 기획제작사를 이름으로 찾아 처음 값으로 쓴다. */
@RestController
@RequestMapping("/api/v1/admin/kopis-companies")
@RequiredArgsConstructor
@LoginRequired
public class AdminKopisCompanyController {

    private final KopisCompanyService kopisCompanyService;

    @GetMapping
    public ResponseEntity<KopisCompanySearchResult> search(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(defaultValue = "") String name
    ) {
        return ResponseEntity.ok(kopisCompanyService.search(name));
    }
}
