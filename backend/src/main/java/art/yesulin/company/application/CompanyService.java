package art.yesulin.company.application;

import static art.yesulin.company.domain.CompanyErrorCode.NOT_FOUND;

import art.yesulin.company.domain.Company;
import art.yesulin.company.domain.CompanyProfile;
import art.yesulin.company.domain.CompanyRepository;
import art.yesulin.company.domain.CompanyStatus;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 운영자의 공연사 정보 관리와 공개 조회. 공개 조회는 운영자가 공개한 공연사만 보여 준다.
 * 감사 로그에는 대표자 이름 같은 정보 원문을 남기지 않는다.
 */
@Service
@RequiredArgsConstructor
public class CompanyService {

    private static final int ADMIN_LIST_LIMIT = 200;
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "COMPANY";

    private final CompanyRepository repository;
    private final AdminAuditLogRepository auditLogRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<AdminCompanyResult> findAllForAdmin() {
        return repository.findAllByOrderByIdDesc(PageRequest.of(0, ADMIN_LIST_LIMIT)).stream()
                .map(AdminCompanyResult::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminCompanyResult findForAdmin(long companyId) {
        return AdminCompanyResult.from(find(companyId));
    }

    /** 새 공연사는 검토 전으로 만든다. 공개해야 공고와 공연사 화면에 보인다. */
    @Transactional
    public AdminCompanyResult create(long adminId, CompanyProfile profile) {
        Company company = repository.save(new Company(profile, adminId, today(), clock.instant()));
        audit(adminId, company, AdminAction.COMPANY_CREATED, "공연사 정보 생성");
        return AdminCompanyResult.from(company);
    }

    @Transactional
    public AdminCompanyResult update(long adminId, long companyId, CompanyProfile profile) {
        Company company = find(companyId);
        company.update(profile, today(), clock.instant());
        audit(adminId, company, AdminAction.COMPANY_EDITED, "공연사 정보 수정");
        return AdminCompanyResult.from(company);
    }

    @Transactional
    public AdminCompanyResult changeStatus(long adminId, long companyId, CompanyStatus status) {
        Company company = find(companyId);
        CompanyStatus previous = company.getStatus();
        company.changeStatus(status, clock.instant());
        if (previous != status) {
            audit(adminId, company, AdminAction.COMPANY_STATUS_CHANGED, "%s → %s".formatted(previous, status));
        }
        return AdminCompanyResult.from(company);
    }

    /** 공개하지 않은 공연사는 없는 공연사처럼 404다. */
    @Transactional(readOnly = true)
    public PublicCompanyResult findPublic(long companyId) {
        return repository.findById(companyId)
                .filter(Company::isPublished)
                .map(PublicCompanyResult::from)
                .orElseThrow(this::notFound);
    }

    /** 공고에 연결할 공연사가 있는지 확인한다. 공개 전인 공연사도 미리 연결할 수 있다. */
    @Transactional(readOnly = true)
    public boolean exists(long companyId) {
        return repository.existsById(companyId);
    }

    /** 운영 화면에 보일 공연사 이름. 공개 여부와 관계없이 찾은 것만 담는다. */
    @Transactional(readOnly = true)
    public Map<Long, String> namesOf(Collection<Long> companyIds) {
        if (companyIds.isEmpty()) {
            return Map.of();
        }
        return repository.findAllById(companyIds).stream()
                .collect(Collectors.toMap(Company::getId, Company::getName));
    }

    /** 공고 상세에 붙일 요약. 연결이 없거나 공개 전이면 비어 있다. */
    @Transactional(readOnly = true)
    public Optional<CompanySummary> findPublishedSummary(Long companyId) {
        if (companyId == null) {
            return Optional.empty();
        }
        return repository.findById(companyId).filter(Company::isPublished).map(CompanySummary::from);
    }

    private Company find(long companyId) {
        return repository.findById(companyId).orElseThrow(this::notFound);
    }

    private void audit(long adminId, Company company, AdminAction action, String detail) {
        auditLogRepository.save(new AdminAuditLog(adminId, action, TARGET_TYPE, company.getId(), detail));
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(KOREA));
    }

    private BusinessException notFound() {
        return new BusinessException(NOT_FOUND, "공연사를 찾을 수 없습니다.");
    }
}
