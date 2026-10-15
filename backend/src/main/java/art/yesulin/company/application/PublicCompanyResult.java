package art.yesulin.company.application;

import art.yesulin.company.domain.Company;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 공개된 공연사 화면. 비워 둔 항목은 null이다.
 *
 * @param representativeName 공개에 동의한 대표자 이름. 동의가 없으면 null이다.
 * @param location 주소가 있으면 시·군·구까지, 없으면 지역
 * @param address 지도에 쓸 주소. 공연사가 알려 준 공식 사업장 주소이고 공개하기로 했을 때만 담는다.
 */
public record PublicCompanyResult(
        long id,
        String name,
        String representativeName,
        List<String> links,
        LocalDate foundedOn,
        String location,
        CompanyAddressResult address,
        String phone,
        String description,
        String history,
        Instant updatedAt
) {

    static PublicCompanyResult from(Company company) {
        return new PublicCompanyResult(
                company.getId(),
                company.getName(),
                company.publicRepresentativeName(),
                List.copyOf(company.getLinks()),
                company.getFoundedOn(),
                company.locationSummary(),
                CompanyAddressResult.from(company.publicAddress()),
                company.getPhone(),
                company.getDescription(),
                company.getHistory(),
                company.getUpdatedAt()
        );
    }
}
