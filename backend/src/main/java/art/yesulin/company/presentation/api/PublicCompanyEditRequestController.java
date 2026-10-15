package art.yesulin.company.presentation.api;

import art.yesulin.company.application.editrequest.CompanyEditRequestService;
import art.yesulin.company.domain.editrequest.CompanyEditRequest;
import art.yesulin.company.domain.editrequest.CompanyField;
import art.yesulin.company.presentation.api.admin.WriteCompanyRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 공개된 공연사 화면에서 누구나 정보 수정을 요청한다. 운영자가 확인한 뒤 적용한다. */
@RestController
@RequestMapping("/api/v1/public/companies/{companyId}/edit-requests")
@RequiredArgsConstructor
public class PublicCompanyEditRequestController {

    private final CompanyEditRequestService editRequestService;

    @PostMapping
    public ResponseEntity<CreatedResponse> create(
            @PathVariable long companyId,
            @Valid @RequestBody CreateRequest request
    ) {
        long id = editRequestService.request(
                companyId, request.company().toProfile(), Set.copyOf(request.changedFields()), request.reason(),
                request.contact()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(new CreatedResponse(id));
    }

    /**
     * 고쳐 달라는 공연사 정보 전체와 요청 사유. {@code company.sourceNote}는 받지 않는다.
     *
     * @param changedFields 요청자가 바꾼 항목. 운영자는 이 항목만 요청 값으로 덮어쓴다.
     * @param contact 확인 연락을 받을 이메일이나 전화번호. 선택이다.
     */
    public record CreateRequest(
            @Valid @NotNull WriteCompanyRequest company,
            @NotEmpty List<@NotNull CompanyField> changedFields,
            @NotBlank @Size(max = CompanyEditRequest.MAX_REASON_LENGTH) String reason,
            @Size(max = CompanyEditRequest.MAX_CONTACT_LENGTH) String contact
    ) {
    }

    public record CreatedResponse(long id) {
    }
}
