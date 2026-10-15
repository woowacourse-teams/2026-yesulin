package art.yesulin.company.application;

import static art.yesulin.company.domain.CompanyErrorCode.CHANGED;
import static art.yesulin.company.domain.CompanyErrorCode.NOT_FOUND;

import art.yesulin.company.application.photo.CompanyPhotoService;
import art.yesulin.company.application.photo.CompanyPhotoStorage;
import art.yesulin.company.domain.Company;
import art.yesulin.company.domain.CompanyProfile;
import art.yesulin.company.domain.CompanyRepository;
import art.yesulin.company.domain.CompanyStatus;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 운영자의 공연사 정보 관리와 공개 조회. 공개 조회는 운영자가 공개한 공연사만 보여 준다.
 * 감사 로그에는 대표자 이름 같은 정보 원문을 남기지 않는다. 대표 사진은 정보와 같은 트랜잭션에서 확정하고, 바뀌어 더 쓰지
 * 않는 사진은 커밋 뒤 저장소에서 지운다.
 */
@Service
@RequiredArgsConstructor
public class CompanyService {

    private static final int ADMIN_LIST_LIMIT = 200;
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "COMPANY";

    private final CompanyRepository repository;
    private final AdminAuditLogRepository auditLogRepository;
    private final CompanyPhotoService photos;
    private final CompanyPhotoStorage photoStorage;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<AdminCompanyResult> findAllForAdmin() {
        return repository.findAllByOrderByIdDesc(PageRequest.of(0, ADMIN_LIST_LIMIT)).stream()
                .map(this::adminResult)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminCompanyResult findForAdmin(long companyId) {
        return adminResult(find(companyId));
    }

    /** 사진 없이 새 공연사를 만든다. */
    @Transactional
    public AdminCompanyResult create(long adminId, CompanyProfile profile) {
        return create(adminId, profile, null);
    }

    /**
     * 새 공연사는 검토 전으로 만든다. 공개해야 공고와 공연사 화면에 보인다.
     *
     * @param photoUrl 이 운영자가 올린 대표 사진의 공개 주소. 없으면 null이다.
     */
    @Transactional
    public AdminCompanyResult create(long adminId, CompanyProfile profile, String photoUrl) {
        Company company = repository.save(new Company(profile, adminId, today(), clock.instant()));
        applyPhoto(adminId, company, photoUrl);
        audit(adminId, company, AdminAction.COMPANY_CREATED, "공연사 정보 생성");
        return adminResult(company);
    }

    /** 정보만 고치고 대표 사진은 그대로 둔다. */
    @Transactional
    public AdminCompanyResult update(long adminId, long companyId, CompanyProfile profile) {
        Company company = find(companyId);
        company.update(profile, today(), clock.instant());
        audit(adminId, company, AdminAction.COMPANY_EDITED, "공연사 정보 수정");
        return adminResult(company);
    }

    /**
     * 정보와 대표 사진을 함께 고친다.
     *
     * @param photoUrl 지금 사진의 공개 주소면 그대로 두고, 이 운영자가 새로 올린 사진 주소면 바꾸고, null이면 지운다.
     */
    @Transactional
    public AdminCompanyResult update(long adminId, long companyId, CompanyProfile profile, String photoUrl) {
        Company company = find(companyId);
        company.update(profile, today(), clock.instant());
        applyPhoto(adminId, company, photoUrl);
        audit(adminId, company, AdminAction.COMPANY_EDITED, "공연사 정보 수정");
        return adminResult(company);
    }

    /**
     * 운영자가 본 뒤로 공연사 정보가 바뀌지 않았는지 확인한다. 정보는 통째로 저장하므로, 그 사이 다른 수정이 반영됐으면 오래된
     * 정보로 덮어쓰지 않게 막는다. DB는 마이크로초까지 저장하므로 그 단위로 비교한다.
     */
    @Transactional(readOnly = true)
    public void ensureUnchangedSince(long companyId, Instant seenUpdatedAt) {
        Instant current = find(companyId).getUpdatedAt().truncatedTo(ChronoUnit.MICROS);
        if (seenUpdatedAt == null || !current.equals(seenUpdatedAt.truncatedTo(ChronoUnit.MICROS))) {
            throw new BusinessException(CHANGED, "그 사이 공연사 정보가 바뀌었습니다. 목록을 새로고침한 뒤 다시 적용해 주세요.");
        }
    }

    /** 이미 확정한 공개 사진 키로 대표 사진을 바꾼다. 수정 요청 사진을 적용할 때 쓴다. */
    @Transactional
    public AdminCompanyResult usePhoto(long companyId, String photoKey) {
        Company company = find(companyId);
        replacePhoto(company, photoKey);
        return adminResult(company);
    }

    @Transactional
    public AdminCompanyResult changeStatus(long adminId, long companyId, CompanyStatus status) {
        Company company = find(companyId);
        CompanyStatus previous = company.getStatus();
        company.changeStatus(status, clock.instant());
        if (previous != status) {
            audit(adminId, company, AdminAction.COMPANY_STATUS_CHANGED, "%s → %s".formatted(previous, status));
        }
        return adminResult(company);
    }

    /** 공개하지 않은 공연사는 없는 공연사처럼 404다. */
    @Transactional(readOnly = true)
    public PublicCompanyResult findPublic(long companyId) {
        return repository.findById(companyId)
                .filter(Company::isPublished)
                .map(company -> PublicCompanyResult.from(company, photoUrlOf(company)))
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
        return repository.findById(companyId).filter(Company::isPublished)
                .map(company -> CompanySummary.from(company, photoUrlOf(company)));
    }

    /** 사진 주소가 지금 사진이면 그대로 두고, 비었으면 지우고, 아니면 이 운영자가 올린 사진으로 확정해 바꾼다. */
    private void applyPhoto(long adminId, Company company, String photoUrl) {
        if (photoUrl == null || photoUrl.isBlank()) {
            replacePhoto(company, null);
            return;
        }
        String current = company.getPhotoKey();
        if (current != null && photoStorage.publicUrl(current).equals(photoUrl)) {
            return;
        }
        replacePhoto(company, photos.claimForAdmin(adminId, photoUrl));
    }

    private void replacePhoto(Company company, String photoKey) {
        String previous = company.getPhotoKey();
        if (Objects.equals(previous, photoKey)) {
            return;
        }
        company.changePhoto(photoKey, clock.instant());
        photos.deleteAfterCommit(previous);
    }

    private AdminCompanyResult adminResult(Company company) {
        return AdminCompanyResult.from(company, photoUrlOf(company));
    }

    private String photoUrlOf(Company company) {
        return company.getPhotoKey() == null ? null : photoStorage.publicUrl(company.getPhotoKey());
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
