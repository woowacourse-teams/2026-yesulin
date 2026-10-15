package art.yesulin.company.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class CompanyTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);
    private static final Instant NOW = Instant.parse("2026-10-15T01:00:00Z");

    @Test
    void trimsTextAndClearsBlankOptionalFields() {
        Company company = company(new CompanyProfile(
                "  극단 예술in ", " ", false, List.of(" https://yesulin.art ", " ", "https://yesulin.art"), null, null, false,
                " ", "", "  ", " ", " "
        ));

        assertEquals("극단 예술in", company.getName());
        assertNull(company.getRepresentativeName());
        assertEquals(List.of("https://yesulin.art"), company.getLinks());
        assertNull(company.getHistory());
        assertNull(company.getRegion());
        assertNull(company.getPhone());
        assertNull(company.getDescription());
        assertNull(company.getSourceNote());
        assertEquals(CompanyStatus.PENDING, company.getStatus());
    }

    @Test
    void rejectsBlankName() {
        assertThrows(BusinessException.class, () -> company(profile(" ", null, null, null)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"yesulin.art", "javascript:alert(1)", "ftp://yesulin.art", "https://"})
    void rejectsLinkThatIsNotWebAddress(String link) {
        assertThrows(BusinessException.class, () -> company(profile("극단", link, null, null)));
    }

    @Test
    void allowsAtMostThreeLinks() {
        List<String> four = List.of("https://a.kr", "https://b.kr", "https://c.kr", "https://d.kr");
        assertThrows(BusinessException.class, () -> company(new CompanyProfile(
                "극단", null, false, four, null, null, false, null, null, null, null, null
        )));
    }

    @Test
    void rejectsFoundedOnInFuture() {
        assertThrows(BusinessException.class, () -> company(profile("극단", null, TODAY.plusDays(1), null)));
        assertEquals(TODAY, company(profile("극단", null, TODAY, null)).getFoundedOn());
    }

    @Test
    void rejectsPhoneWithLetters() {
        assertThrows(BusinessException.class, () -> company(profile("극단", null, null, "전화 02-123")));
        assertEquals("02-765-4321", company(profile("극단", null, null, "02-765-4321")).getPhone());
    }

    @Test
    void summarizesLocationFromAddressOrRegion() {
        CompanyAddress address = new CompanyAddress(
                "서울 종로구 대학로 12", "3층", "03086", new BigDecimal("37.5822"), new BigDecimal("127.0017")
        );
        Company withAddress = company(
                new CompanyProfile("극단", null, false, null, null, address, true, "부산", null, null, null, null)
        );
        Company withRegion = company(
                new CompanyProfile("극단", null, false, null, null, null, false, "부산", null, null, null, null)
        );
        Company withoutLocation = company(profile("극단", null, null, null));

        assertEquals("서울 종로구", withAddress.locationSummary());
        assertEquals("부산", withRegion.locationSummary());
        assertNull(withoutLocation.locationSummary());
    }

    @Test
    void hidesRepresentativeAndDetailedAddressWithoutConsent() {
        CompanyAddress address = new CompanyAddress("서울 마포구 성미산로 1", "101호", "", null, null);
        Company hidden = company(new CompanyProfile(
                "극단", "홍길동", false, null, null, address, false, null, null, null, null, "대표 인스타그램"
        ));
        final Company shown = company(new CompanyProfile(
                "극단", "홍길동", true, null, null, address, true, null, null, null, null, null
        ));

        assertNull(hidden.publicRepresentativeName());
        assertNull(hidden.publicAddress());
        assertEquals("서울 마포구", hidden.locationSummary());
        assertEquals("홍길동", hidden.getRepresentativeName());
        assertEquals("대표 인스타그램", hidden.getSourceNote());
        assertEquals("홍길동", shown.publicRepresentativeName());
        assertEquals(address, shown.publicAddress());
    }

    @Test
    void requiresBothCoordinatesTogether() {
        assertThrows(BusinessException.class, () -> new CompanyAddress(
                "서울 종로구 대학로 12", "", "", new BigDecimal("37.5822"), null
        ));
    }

    @Test
    void cannotReturnToPendingAfterDecision() {
        Company company = company(profile("극단", null, null, null));

        company.changeStatus(CompanyStatus.PUBLISHED, NOW);
        company.changeStatus(CompanyStatus.HIDDEN, NOW);

        assertEquals(CompanyStatus.HIDDEN, company.getStatus());
        assertThrows(BusinessException.class, () -> company.changeStatus(CompanyStatus.PENDING, NOW));
    }

    private static Company company(CompanyProfile profile) {
        return new Company(profile, 1L, TODAY, NOW);
    }

    private static CompanyProfile profile(String name, String link, LocalDate foundedOn, String phone) {
        List<String> links = link == null ? List.of() : List.of(link);
        return new CompanyProfile(name, null, false, links, foundedOn, null, false, null, phone, null, null, null);
    }
}
