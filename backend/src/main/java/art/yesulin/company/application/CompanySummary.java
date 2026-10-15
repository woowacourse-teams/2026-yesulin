package art.yesulin.company.application;

import art.yesulin.company.domain.Company;
import java.time.LocalDate;

/**
 * 공고 상세에 함께 보이는 공연사 요약. 공개된 공연사만 만든다.
 *
 * @param representativeName 공개에 동의한 대표자 이름. 동의가 없으면 null이다.
 * @param location 주소가 있으면 시·군·구까지, 없으면 지역. 둘 다 없으면 null이다.
 */
public record CompanySummary(
        long id,
        String name,
        String representativeName,
        String homepage,
        LocalDate foundedOn,
        String location
) {

    static CompanySummary from(Company company) {
        return new CompanySummary(
                company.getId(),
                company.getName(),
                company.publicRepresentativeName(),
                company.getHomepage(),
                company.getFoundedOn(),
                company.locationSummary()
        );
    }
}
