package art.yesulin.company.application.editrequest;

import static art.yesulin.company.domain.CompanyErrorCode.EDIT_REQUEST_NOT_FOUND;

import art.yesulin.company.application.AdminCompanyResult;
import art.yesulin.company.application.CompanyService;
import art.yesulin.company.application.PublicCompanyResult;
import art.yesulin.company.domain.CompanyProfile;
import art.yesulin.company.domain.editrequest.CompanyEditRequest;
import art.yesulin.company.domain.editrequest.CompanyEditRequestRepository;
import art.yesulin.company.domain.editrequest.CompanyEditRequestStatus;
import art.yesulin.company.domain.editrequest.CompanyField;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 공연사 정보 수정 요청. 공개된 공연사에 누구나 요청하고, 운영자가 바뀐 항목을 확인해 다듬은 정보로 적용하거나 반려한다.
 * 감사 로그에는 요청 내용과 요청자 연락처를 남기지 않는다.
 */
@Service
@RequiredArgsConstructor
public class CompanyEditRequestService {

    private static final int PENDING_LIST_LIMIT = 100;
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "COMPANY_EDIT_REQUEST";

    private final CompanyEditRequestRepository repository;
    private final CompanyService companies;
    private final AdminAuditLogRepository auditLogRepository;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    /** 공개된 공연사에만 요청할 수 있다. 공개 전이거나 내린 공연사는 없는 공연사처럼 404다. */
    @Transactional
    public long request(
            long companyId,
            CompanyProfile proposal,
            Set<CompanyField> changedFields,
            String reason,
            String contact
    ) {
        PublicCompanyResult company = companies.findPublic(companyId);
        CompanyEditRequest saved = repository.save(new CompanyEditRequest(
                companyId, withoutSourceNote(proposal), changedFields, reason, contact, today(), clock.instant()
        ));
        events.publishEvent(new CompanyEditRequestedEvent(saved.getId(), companyId, company.name(), saved.getReason()));
        return saved.getId();
    }

    /** 처리하지 않은 요청을 최근 순으로 지금 공연사 정보와 함께 준다. */
    @Transactional(readOnly = true)
    public List<AdminCompanyEditRequestResult> findPending() {
        return repository.findAllByStatusOrderByIdDesc(
                        CompanyEditRequestStatus.PENDING, PageRequest.of(0, PENDING_LIST_LIMIT)
                ).stream()
                .map(request -> AdminCompanyEditRequestResult.of(
                        request, companies.findForAdmin(request.getCompanyId())
                ))
                .toList();
    }

    /** 운영자가 요청을 보고 다듬은 정보로 공연사를 고친다. 공개 상태는 그대로 둔다. */
    @Transactional
    public AdminCompanyResult apply(long adminId, long requestId, CompanyProfile profile) {
        CompanyEditRequest request = find(requestId);
        request.apply(adminId, clock.instant());
        AdminCompanyResult updated = companies.update(adminId, request.getCompanyId(), profile);
        audit(adminId, request, AdminAction.COMPANY_EDIT_REQUEST_APPLIED, "공연사 %d에 적용".formatted(updated.id()));
        return updated;
    }

    @Transactional
    public void reject(long adminId, long requestId) {
        CompanyEditRequest request = find(requestId);
        request.reject(adminId, clock.instant());
        audit(adminId, request, AdminAction.COMPANY_EDIT_REQUEST_REJECTED, "반려");
    }

    private CompanyEditRequest find(long requestId) {
        return repository.findById(requestId)
                .orElseThrow(() -> new BusinessException(EDIT_REQUEST_NOT_FOUND, "수정 요청을 찾을 수 없습니다."));
    }

    private void audit(long adminId, CompanyEditRequest request, AdminAction action, String detail) {
        auditLogRepository.save(new AdminAuditLog(adminId, action, TARGET_TYPE, request.getId(), detail));
    }

    private static CompanyProfile withoutSourceNote(CompanyProfile proposal) {
        if (proposal == null) {
            return null;
        }
        return new CompanyProfile(
                proposal.name(), proposal.representativeName(), proposal.representativeNamePublic(), proposal.links(),
                proposal.foundedOn(), proposal.address(), proposal.addressPublic(), proposal.region(),
                proposal.phone(), proposal.description(), proposal.history(), null
        );
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(KOREA));
    }
}
