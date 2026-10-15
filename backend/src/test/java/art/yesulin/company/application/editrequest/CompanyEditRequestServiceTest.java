package art.yesulin.company.application.editrequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.company.application.AdminCompanyResult;
import art.yesulin.company.application.CompanyService;
import art.yesulin.company.domain.CompanyErrorCode;
import art.yesulin.company.domain.CompanyProfile;
import art.yesulin.company.domain.CompanyStatus;
import art.yesulin.company.domain.editrequest.CompanyEditRequestRepository;
import art.yesulin.company.domain.editrequest.CompanyEditRequestStatus;
import art.yesulin.company.domain.editrequest.CompanyField;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:company-edit-request;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class CompanyEditRequestServiceTest {

    private static final long ADMIN_ID = 1L;

    @Autowired
    private CompanyEditRequestService editRequestService;

    @Autowired
    private CompanyEditRequestRepository repository;

    @Autowired
    private CompanyService companyService;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        auditLogRepository.deleteAll();
    }

    @Test
    void acceptsRequestOnlyForPublishedCompany() {
        long companyId = companyService.create(ADMIN_ID, CompanyProfile.named("극단 예술in")).id();

        BusinessException exception = assertThrows(BusinessException.class, () -> request(companyId));
        assertEquals(CompanyErrorCode.NOT_FOUND, exception.getErrorCode());

        companyService.changeStatus(ADMIN_ID, companyId, CompanyStatus.PUBLISHED);
        long requestId = request(companyId);

        List<AdminCompanyEditRequestResult> pending = editRequestService.findPending();
        assertEquals(1, pending.size());
        AdminCompanyEditRequestResult result = pending.getFirst();
        assertEquals(requestId, result.id());
        assertEquals("극단 예술in", result.company().name());
        assertEquals("2015 창단", result.proposal().history());
        assertEquals("help@yesulin.art", result.contact());
        assertEquals(List.of(CompanyField.HISTORY), result.changedFields());
    }

    @Test
    void appliesAdminReviewedProfileAndKeepsCompanyPublished() {
        long companyId = publishedCompany();
        long requestId = request(companyId);

        AdminCompanyResult updated = editRequestService.apply(ADMIN_ID, requestId, new CompanyProfile(
                "극단 예술in", null, false, List.of(), null, null, false, "서울", null, null, "2015 창단",
                "수정 요청 확인"
        ), null, false, seen(companyId));

        assertEquals("2015 창단", updated.history());
        assertEquals("수정 요청 확인", updated.sourceNote());
        assertEquals(CompanyStatus.PUBLISHED, updated.status());
        assertTrue(editRequestService.findPending().isEmpty());
        var saved = repository.findById(requestId).orElseThrow();
        assertEquals(CompanyEditRequestStatus.APPLIED, saved.getStatus());
        assertNull(saved.getContact());
        assertEquals(
                List.of(AdminAction.COMPANY_EDITED, AdminAction.COMPANY_EDIT_REQUEST_APPLIED),
                auditLogRepository.findAll().stream().map(AdminAuditLog::getAction).toList().subList(2, 4)
        );
    }

    @Test
    void rejectLeavesCompanyUnchanged() {
        long companyId = publishedCompany();
        long requestId = request(companyId);

        editRequestService.reject(ADMIN_ID, requestId);

        assertNull(companyService.findForAdmin(companyId).history());
        assertEquals(CompanyEditRequestStatus.REJECTED, repository.findById(requestId).orElseThrow().getStatus());
        BusinessException exception = assertThrows(
                BusinessException.class, () -> editRequestService.reject(ADMIN_ID, requestId)
        );
        assertEquals(CompanyErrorCode.EDIT_REQUEST_RESOLVED, exception.getErrorCode());
    }

    @Test
    void refusesToApplyOverChangesMadeAfterAdminOpenedTheRequest() {
        long companyId = publishedCompany();
        long first = request(companyId);
        long second = request(companyId);
        Instant seenBoth = seen(companyId);

        editRequestService.apply(ADMIN_ID, first, CompanyProfile.named("새 이름"), null, false, seenBoth);

        BusinessException exception = assertThrows(BusinessException.class, () -> editRequestService.apply(
                ADMIN_ID, second, CompanyProfile.named("오래된 이름"), null, false, seenBoth
        ));
        assertEquals(CompanyErrorCode.CHANGED, exception.getErrorCode());
        assertEquals("새 이름", companyService.findForAdmin(companyId).name());
        assertEquals(CompanyEditRequestStatus.PENDING, repository.findById(second).orElseThrow().getStatus());
    }

    private Instant seen(long companyId) {
        return companyService.findForAdmin(companyId).updatedAt();
    }

    private long publishedCompany() {
        long companyId = companyService.create(ADMIN_ID, CompanyProfile.named("극단 예술in")).id();
        companyService.changeStatus(ADMIN_ID, companyId, CompanyStatus.PUBLISHED);
        return companyId;
    }

    private long request(long companyId) {
        return editRequestService.request(companyId, new CompanyProfile(
                "극단 예술in", null, false, List.of(), null, null, false, null, null, null, "2015 창단", "무시"
        ), Set.of(CompanyField.HISTORY), "연혁을 넣어 주세요.", "help@yesulin.art", null);
    }
}
