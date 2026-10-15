package art.yesulin.company.application;

import art.yesulin.company.domain.Company;
import art.yesulin.company.domain.CompanyStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** 운영자 공연사 목록과 편집 화면. 공개하지 않는 대표자 이름·상세 주소·정보 출처도 담는다. 비워 둔 항목은 null이다. */
public record AdminCompanyResult(
        long id,
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
        String sourceNote,
        CompanyStatus status,
        Instant createdAt,
        Instant updatedAt
) {

    static AdminCompanyResult from(Company company) {
        return new AdminCompanyResult(
                company.getId(),
                company.getName(),
                company.getRepresentativeName(),
                company.isRepresentativeNamePublic(),
                List.copyOf(company.getLinks()),
                company.getFoundedOn(),
                CompanyAddressResult.from(company.getAddress()),
                company.isAddressPublic(),
                company.getRegion(),
                company.getPhone(),
                company.getDescription(),
                company.getHistory(),
                company.getSourceNote(),
                company.getStatus(),
                company.getCreatedAt(),
                company.getUpdatedAt()
        );
    }
}
