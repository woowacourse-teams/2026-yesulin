package art.yesulin.company.application.editrequest;

import static art.yesulin.company.domain.CompanyErrorCode.EDIT_REQUEST_NOT_FOUND;

import art.yesulin.company.application.AdminCompanyResult;
import art.yesulin.company.application.CompanyService;
import art.yesulin.company.application.PublicCompanyResult;
import art.yesulin.company.application.photo.CompanyPhotoService;
import art.yesulin.company.application.photo.CompanyPhotoStorage;
import art.yesulin.company.application.photo.CompanyPhotoUploadResult;
import art.yesulin.company.domain.CompanyProfile;
import art.yesulin.company.domain.editrequest.CompanyEditRequest;
import art.yesulin.company.domain.editrequest.CompanyEditRequestRepository;
import art.yesulin.company.domain.editrequest.CompanyEditRequestStatus;
import art.yesulin.company.domain.editrequest.CompanyField;
import art.yesulin.file.application.storage.StoredObjectContent;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 공연사 정보 수정 요청. 공개된 공연사에 누구나 요청하고, 운영자가 바뀐 항목을 확인해 다듬은 정보로 적용하거나 반려한다.
 * 감사 로그에는 요청 내용과 요청자 연락처를 남기지 않는다. 요청과 함께 보낸 사진은 비공개로 두었다가 운영자가 그 사진을 쓰기로
 * 하면 공개 경로로 복사하고, 처리가 끝나면 비공개 사진을 지운다.
 */
@Service
@RequiredArgsConstructor
public class CompanyEditRequestService {

    private static final int PENDING_LIST_LIMIT = 100;
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "COMPANY_EDIT_REQUEST";

    private final CompanyEditRequestRepository repository;
    private final CompanyService companies;
    private final CompanyPhotoService photos;
    private final CompanyPhotoStorage photoStorage;
    private final AdminAuditLogRepository auditLogRepository;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    /** 수정 요청에 넣을 사진을 올릴 자리. 공개된 공연사에만 올릴 수 있다. */
    @Transactional
    public CompanyPhotoUploadResult preparePhotoUpload(long companyId, String contentType, long size) {
        companies.findPublic(companyId);
        return photos.prepareForRequest(contentType, size);
    }

    /**
     * 공개된 공연사에만 요청할 수 있다. 공개 전이거나 내린 공연사는 없는 공연사처럼 404다.
     *
     * @param photoUploadKey 사진을 바꿔 달라는 요청에 함께 올린 사진. 사진을 바꾼 요청인데 없으면 사진을 지워 달라는 뜻이다.
     */
    @Transactional
    public long request(
            long companyId,
            CompanyProfile proposal,
            Set<CompanyField> changedFields,
            String reason,
            String contact,
            String photoUploadKey
    ) {
        PublicCompanyResult company = companies.findPublic(companyId);
        CompanyEditRequest request = new CompanyEditRequest(
                companyId, withoutSourceNote(proposal), changedFields, reason, contact, today(), clock.instant()
        );
        if (request.requestsPhotoChange() && photoUploadKey != null && !photoUploadKey.isBlank()) {
            request.attachPhoto(photos.claimForRequest(photoUploadKey));
        }
        CompanyEditRequest saved = repository.save(request);
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

    /** 운영자가 볼 요청 사진. 사진이 없거나 이미 처리한 요청이면 404다. */
    @Transactional(readOnly = true)
    public StoredObjectContent findPhoto(long requestId) {
        String photoKey = find(requestId).getPhotoKey();
        return (photoKey == null ? Optional.<StoredObjectContent>empty() : photoStorage.read(photoKey))
                .orElseThrow(() -> new BusinessException(EDIT_REQUEST_NOT_FOUND, "수정 요청 사진을 찾을 수 없습니다."));
    }

    /**
     * 운영자가 요청을 보고 다듬은 정보로 공연사를 고친다. 바꾼 항목만 덮어쓰는 일은 화면이 한다. 공개 상태는 그대로 둔다.
     *
     * @param photoUrl {@code useRequestedPhoto}가 아니면 쓸 대표 사진 주소. 운영자 편집과 같은 규칙이다.
     * @param useRequestedPhoto 요청과 함께 온 사진을 대표 사진으로 쓸지
     * @param seenUpdatedAt 운영자가 본 공연사 정보의 갱신 시각. 그 사이 바뀌었으면 오래된 정보로 덮어쓰지 않고 거절한다.
     */
    @Transactional
    public AdminCompanyResult apply(
            long adminId,
            long requestId,
            CompanyProfile profile,
            String photoUrl,
            boolean useRequestedPhoto,
            Instant seenUpdatedAt
    ) {
        CompanyEditRequest request = find(requestId);
        companies.ensureUnchangedSince(request.getCompanyId(), seenUpdatedAt);
        String requestedPhoto = request.getPhotoKey();
        request.apply(adminId, clock.instant());
        AdminCompanyResult updated;
        if (useRequestedPhoto && requestedPhoto != null) {
            companies.update(adminId, request.getCompanyId(), profile);
            updated = companies.usePhoto(request.getCompanyId(), photoStorage.publish(requestedPhoto));
        } else {
            updated = companies.update(adminId, request.getCompanyId(), profile, photoUrl);
        }
        photos.deleteAfterCommit(requestedPhoto);
        audit(adminId, request, AdminAction.COMPANY_EDIT_REQUEST_APPLIED, "공연사 %d에 적용".formatted(updated.id()));
        return updated;
    }

    @Transactional
    public void reject(long adminId, long requestId) {
        CompanyEditRequest request = find(requestId);
        String requestedPhoto = request.getPhotoKey();
        request.reject(adminId, clock.instant());
        photos.deleteAfterCommit(requestedPhoto);
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
