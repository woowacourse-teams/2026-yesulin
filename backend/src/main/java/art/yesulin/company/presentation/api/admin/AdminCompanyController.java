package art.yesulin.company.presentation.api.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.company.application.AdminCompanyResult;
import art.yesulin.company.application.CompanyService;
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

/** 운영자가 공연사 정보를 만들고 고친 뒤 공개한다. 공개해야 공고와 공연사 화면에 보인다. */
@RestController
@RequestMapping("/api/v1/admin/companies")
@RequiredArgsConstructor
@LoginRequired
public class AdminCompanyController {

    private final CompanyService companyService;

    @GetMapping
    public ResponseEntity<AdminCompaniesResponse> findAll(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(new AdminCompaniesResponse(companyService.findAllForAdmin()));
    }

    @PostMapping
    public ResponseEntity<AdminCompanyResult> create(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody WriteCompanyRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(companyService.create(principal.memberId(), request.toProfile(), request.photoUrl()));
    }

    @GetMapping("/{companyId}")
    public ResponseEntity<AdminCompanyResult> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long companyId
    ) {
        return ResponseEntity.ok(companyService.findForAdmin(companyId));
    }

    @PutMapping("/{companyId}")
    public ResponseEntity<AdminCompanyResult> update(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long companyId,
            @Valid @RequestBody WriteCompanyRequest request
    ) {
        return ResponseEntity.ok(
                companyService.update(principal.memberId(), companyId, request.toProfile(), request.photoUrl())
        );
    }

    @PatchMapping("/{companyId}/status")
    public ResponseEntity<AdminCompanyResult> changeStatus(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long companyId,
            @Valid @RequestBody ChangeCompanyStatusRequest request
    ) {
        return ResponseEntity.ok(companyService.changeStatus(principal.memberId(), companyId, request.status()));
    }
}
