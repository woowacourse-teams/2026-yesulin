package art.yesulin.company.application.photo;

import static art.yesulin.company.domain.CompanyErrorCode.INVALID_INPUT;

import art.yesulin.company.application.photo.CompanyPhotoStorage.PreparedPhoto;
import art.yesulin.company.domain.photo.CompanyPhotoRules;
import art.yesulin.company.domain.photo.CompanyPhotoUpload;
import art.yesulin.company.domain.photo.CompanyPhotoUploadRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 공연사 사진 업로드. 브라우저가 저장소로 바로 올릴 자리를 만들고, 운영자가 공연사를 저장하거나 누군가 수정 요청을 보낼 때
 * 올라온 사진을 확인해 확정한다. 운영자 사진은 올린 운영자만, 수정 요청 사진은 업로드 키를 아는 요청자가 한 번 확정한다.
 * 하루가 지나도록 확정하지 않은 업로드는 저장소에서 지운다.
 */
@Service
@RequiredArgsConstructor
public class CompanyPhotoService {

    /** 정보를 쓰는 화면을 오래 열어 둘 수 있으므로 하루는 기다린 뒤 정리한다. */
    static final Duration UNCLAIMED_RETENTION = Duration.ofDays(1);
    private static final int CLEANUP_BATCH_SIZE = 200;

    private final CompanyPhotoUploadRepository repository;
    private final CompanyPhotoStorage storage;
    private final Clock clock;

    /** 운영자가 올릴 자리. 공개 경로에 두며, 공연사를 저장할 때 {@code photoUrl}로 확정한다. */
    @Transactional
    public CompanyPhotoUploadResult prepareForAdmin(long adminId, String reportedType, long size) {
        PreparedPhoto prepared = prepare(true, adminId, reportedType, size);
        return CompanyPhotoUploadResult.of(prepared.upload(), storage.publicUrl(prepared.objectKey()), null);
    }

    /** 수정 요청에 쓸 자리. 비공개 경로에 두며, 요청을 보낼 때 {@code uploadKey}로 확정한다. */
    @Transactional
    public CompanyPhotoUploadResult prepareForRequest(String reportedType, long size) {
        PreparedPhoto prepared = prepare(false, null, reportedType, size);
        return CompanyPhotoUploadResult.of(prepared.upload(), null, prepared.objectKey());
    }

    /** 운영자가 올린 공개 사진을 확정하고 저장소 키를 준다. 이 운영자가 올린 사진 주소가 아니면 거절한다. */
    public String claimForAdmin(long adminId, String photoUrl) {
        String objectKey = storage.publicKeyOf(photoUrl).orElseThrow(CompanyPhotoService::rejected);
        return claim(objectKey, adminId);
    }

    /** 수정 요청과 함께 올린 비공개 사진을 확정하고 저장소 키를 준다. */
    public String claimForRequest(String uploadKey) {
        if (!storage.isPrivateKey(uploadKey)) {
            throw rejected();
        }
        return claim(uploadKey, null);
    }

    /** 확정하지 않은 채 하루가 지난 업로드를 지운다. 저장소에서 지우지 못한 것은 기록을 남겨 다음에 다시 시도한다. */
    @Transactional
    public int deleteUnclaimed() {
        List<CompanyPhotoUpload> expired = repository.findAllByCreatedAtBeforeOrderByIdAsc(
                clock.instant().minus(UNCLAIMED_RETENTION), PageRequest.of(0, CLEANUP_BATCH_SIZE)
        );
        List<CompanyPhotoUpload> deleted = expired.stream()
                .filter(upload -> storage.tryDelete(upload.getObjectKey()))
                .toList();
        repository.deleteAll(deleted);
        return deleted.size();
    }

    /** 바뀌어 더 쓰지 않는 사진을 커밋 뒤 지운다. 롤백되면 그대로 둔다. */
    public void deleteAfterCommit(String objectKey) {
        if (objectKey == null) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            storage.tryDelete(objectKey);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                storage.tryDelete(objectKey);
            }
        });
    }

    private PreparedPhoto prepare(boolean publicPhoto, Long adminId, String reportedType, long size) {
        String contentType = CompanyPhotoRules.contentType(reportedType).orElseThrow(() ->
                new BusinessException(INVALID_INPUT, "사진은 JPG·PNG·WebP만 올릴 수 있습니다."));
        if (size <= 0 || size > CompanyPhotoRules.MAX_BYTES) {
            throw new BusinessException(
                    INVALID_INPUT, "사진은 %dMB까지 올릴 수 있습니다.", CompanyPhotoRules.MAX_BYTES / 1024 / 1024
            );
        }
        PreparedPhoto prepared = storage.prepare(publicPhoto, contentType, size);
        repository.save(new CompanyPhotoUpload(prepared.objectKey(), adminId, contentType, size, clock.instant()));
        return prepared;
    }

    private String claim(String objectKey, Long adminId) {
        CompanyPhotoUpload upload = repository.findByObjectKey(objectKey)
                .filter(candidate -> candidate.isClaimableBy(adminId))
                .orElseThrow(CompanyPhotoService::rejected);
        if (!storage.confirm(objectKey, upload.getContentType(), upload.getSize())) {
            throw new BusinessException(INVALID_INPUT, "사진을 다 올리지 못했거나 사진 파일이 아닙니다. 다시 올려 주세요.");
        }
        repository.delete(upload);
        return objectKey;
    }

    /** 이 화면에서 올린 사진이 아니거나 이미 쓴 사진이다. */
    private static BusinessException rejected() {
        return new BusinessException(INVALID_INPUT, "사진을 찾을 수 없습니다. 다시 올려 주세요.");
    }
}
