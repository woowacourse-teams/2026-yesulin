package art.yesulin.company.presentation.api;

import art.yesulin.company.application.CompanyService;
import art.yesulin.company.application.PublicCompanyResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 없이 보는 공연사 화면. 이 공연사의 공고는 공고 API가 따로 준다. */
@RestController
@RequestMapping("/api/v1/public/companies")
@RequiredArgsConstructor
public class PublicCompanyController {

    private final CompanyService companyService;

    @GetMapping("/{companyId}")
    public ResponseEntity<PublicCompanyResult> find(@PathVariable long companyId) {
        return ResponseEntity.ok(companyService.findPublic(companyId));
    }
}
