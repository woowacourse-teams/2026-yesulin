package art.yesulin.company.domain.editrequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.company.domain.CompanyErrorCode;
import art.yesulin.company.domain.CompanyProfile;
import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class CompanyEditRequestTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);
    private static final Instant NOW = Instant.parse("2026-10-15T01:00:00Z");
    private static final long ADMIN_ID = 1L;

    @Test
    void keepsNormalizedProposalWithoutSourceNote() {
        CompanyEditRequest request = new CompanyEditRequest(1L, new CompanyProfile(
                " 극단 예술in ", " ", false, List.of(" https://yesulin.art ", ""), null, null, false,
                "서울", null, "  ", "2015 창단", "출처"
        ), Set.of(CompanyField.HISTORY, CompanyField.LINKS), " 연혁이 달라요 ", " ", TODAY, NOW);

        CompanyProfile proposal = request.proposal();
        assertEquals("극단 예술in", proposal.name());
        assertNull(proposal.representativeName());
        assertEquals(List.of("https://yesulin.art"), proposal.links());
        assertNull(proposal.description());
        assertNull(proposal.sourceNote());
        assertEquals("연혁이 달라요", request.getReason());
        assertNull(request.getContact());
        assertEquals(CompanyEditRequestStatus.PENDING, request.getStatus());
        assertEquals(List.of(CompanyField.LINKS, CompanyField.HISTORY), List.copyOf(request.changedFields()));
    }

    @Test
    void requiresChangedField() {
        assertThrows(BusinessException.class, () -> new CompanyEditRequest(
                1L, named("극단"), Set.of(), "이름", null, TODAY, NOW
        ));
    }

    @Test
    void rejectsProposalThatBreaksCompanyRules() {
        assertThrows(BusinessException.class, () -> request(new CompanyProfile(
                "극단", null, false, List.of("yesulin.art"), null, null, false, null, null, null, null, null
        ), "링크"));
    }

    @Test
    void requiresReason() {
        assertThrows(BusinessException.class, () -> request(named("극단"), " "));
    }

    @Test
    void clearsContactWhenResolved() {
        CompanyEditRequest request = new CompanyEditRequest(
                1L, named("극단"), Set.of(CompanyField.NAME), "이름", "help@yesulin.art", TODAY, NOW
        );

        request.apply(ADMIN_ID, NOW);

        assertEquals(CompanyEditRequestStatus.APPLIED, request.getStatus());
        assertEquals(ADMIN_ID, request.getResolvedBy());
        assertNull(request.getContact());
    }

    @Test
    void cannotResolveTwice() {
        CompanyEditRequest request = request(named("극단"), "이름");
        request.reject(ADMIN_ID, NOW);

        BusinessException exception = assertThrows(BusinessException.class, () -> request.apply(ADMIN_ID, NOW));
        assertEquals(CompanyErrorCode.EDIT_REQUEST_RESOLVED, exception.getErrorCode());
    }

    private static CompanyEditRequest request(CompanyProfile proposal, String reason) {
        return new CompanyEditRequest(1L, proposal, Set.of(CompanyField.NAME), reason, null, TODAY, NOW);
    }

    private static CompanyProfile named(String name) {
        return CompanyProfile.named(name);
    }
}
