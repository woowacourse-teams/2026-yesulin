package art.yesulin.company.application.editrequest;

import art.yesulin.company.application.AdminCompanyResult;
import art.yesulin.company.application.CompanyAddressResult;
import art.yesulin.company.domain.editrequest.CompanyEditRequest;
import art.yesulin.company.domain.editrequest.CompanyField;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 운영자가 보는 수정 요청. 지금 공연사 정보({@code company})와 요청한 정보({@code proposal})를 함께 줘 바뀐 항목을 비교한다.
 *
 * @param changedFields 요청자가 바꾼 항목. 운영자는 이 항목만 요청 값으로 덮어쓴다.
 * @param contact 요청자가 남긴 연락처. 없으면 null이다.
 */
public record AdminCompanyEditRequestResult(
        long id,
        AdminCompanyResult company,
        Proposal proposal,
        List<CompanyField> changedFields,
        String reason,
        String contact,
        Instant createdAt
) {

    static AdminCompanyEditRequestResult of(CompanyEditRequest request, AdminCompanyResult company) {
        return new AdminCompanyEditRequestResult(
                request.getId(),
                company,
                new Proposal(
                        request.getName(),
                        request.getRepresentativeName(),
                        request.isRepresentativeNamePublic(),
                        List.copyOf(request.getLinks()),
                        request.getFoundedOn(),
                        CompanyAddressResult.from(request.getAddress()),
                        request.isAddressPublic(),
                        request.getRegion(),
                        request.getPhone(),
                        request.getDescription(),
                        request.getHistory(),
                        request.getPhotoKey() != null
                ),
                List.copyOf(request.changedFields()),
                request.getReason(),
                request.getContact(),
                request.getCreatedAt()
        );
    }

    /**
     * 요청한 공연사 정보. 비워 달라는 항목은 null이다.
     *
     * @param photoAttached 사진을 함께 보냈는지. 운영자 화면은 요청 사진 조회 API로 본다.
     */
    public record Proposal(
            String name,
            String representativeName,
            boolean representativeNamePublic,
            List<String> links,
            LocalDate foundedOn,
            CompanyAddressResult address,
            boolean addressPublic,
            String region,
            String phone,
            String description,
            String history,
            boolean photoAttached
    ) {
    }
}
