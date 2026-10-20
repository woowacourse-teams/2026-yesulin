package art.yesulin.event.application.image;

import static art.yesulin.event.domain.EventErrorCode.INVALID_INPUT;

import art.yesulin.event.application.image.EventImageStorage.PreparedImage;
import art.yesulin.event.domain.image.EventImageRules;
import art.yesulin.event.domain.image.EventImageUpload;
import art.yesulin.event.domain.image.EventImageUploadRepository;
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
 * 이벤트 이미지 업로드. 브라우저가 저장소로 바로 올릴 자리를 만들고, 운영자가 이벤트를 저장할 때 올라온 이미지를 확인해
 * 확정한다. 올린 운영자만 확정할 수 있고, 하루가 지나도록 확정하지 않은 업로드는 저장소에서 지운다.
 */
@Service
@RequiredArgsConstructor
public class EventImageService {

    /** 글을 쓰는 화면을 오래 열어 둘 수 있으므로 하루는 기다린 뒤 정리한다. */
    static final Duration UNCLAIMED_RETENTION = Duration.ofDays(1);
    private static final int CLEANUP_BATCH_SIZE = 200;

    private final EventImageUploadRepository repository;
    private final EventImageStorage storage;
    private final Clock clock;

    @Transactional
    public EventImageUploadResult prepare(long adminId, String reportedType, long size) {
        String contentType = EventImageRules.contentType(reportedType).orElseThrow(() ->
                new BusinessException(INVALID_INPUT, "이미지는 JPG·PNG·WebP만 올릴 수 있습니다."));
        if (size <= 0 || size > EventImageRules.MAX_BYTES) {
            throw new BusinessException(
                    INVALID_INPUT, "이미지는 %dMB까지 올릴 수 있습니다.", EventImageRules.MAX_BYTES / 1024 / 1024
            );
        }
        PreparedImage prepared = storage.prepare(contentType, size);
        repository.save(new EventImageUpload(prepared.objectKey(), adminId, contentType, size, clock.instant()));
        return EventImageUploadResult.of(prepared.upload(), storage.publicUrl(prepared.objectKey()));
    }

    /** 이 운영자가 올린 이미지를 확정하고 저장소 키를 준다. 다른 주소거나 이미 쓴 이미지면 거절한다. */
    public String claim(long adminId, String imageUrl) {
        String objectKey = storage.keyOf(imageUrl).orElseThrow(EventImageService::rejected);
        EventImageUpload upload = repository.findByObjectKey(objectKey)
                .filter(candidate -> candidate.isClaimableBy(adminId))
                .orElseThrow(EventImageService::rejected);
        if (!storage.confirm(objectKey, upload.getContentType(), upload.getSize())) {
            throw new BusinessException(INVALID_INPUT, "이미지를 다 올리지 못했거나 이미지 파일이 아닙니다. 다시 올려 주세요.");
        }
        repository.delete(upload);
        return objectKey;
    }

    /** 확정하지 않은 채 하루가 지난 업로드를 지운다. 저장소에서 지우지 못한 것은 기록을 남겨 다음에 다시 시도한다. */
    @Transactional
    public int deleteUnclaimed() {
        List<EventImageUpload> expired = repository.findAllByCreatedAtBeforeOrderByIdAsc(
                clock.instant().minus(UNCLAIMED_RETENTION), PageRequest.of(0, CLEANUP_BATCH_SIZE)
        );
        List<EventImageUpload> deleted = expired.stream()
                .filter(upload -> storage.tryDelete(upload.getObjectKey()))
                .toList();
        repository.deleteAll(deleted);
        return deleted.size();
    }

    /** 바뀌어 더 쓰지 않는 이미지를 커밋 뒤 지운다. 롤백되면 그대로 둔다. */
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

    /** 이 화면에서 올린 이미지가 아니거나 이미 쓴 이미지다. */
    private static BusinessException rejected() {
        return new BusinessException(INVALID_INPUT, "이미지를 찾을 수 없습니다. 다시 올려 주세요.");
    }
}
