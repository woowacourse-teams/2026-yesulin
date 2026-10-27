package art.yesulin.actor.application.photolibrary;

import static art.yesulin.actor.domain.photolibrary.PhotoLibraryErrorCode.INVALID_PUBLIC_COPY;
import static art.yesulin.actor.domain.photolibrary.PhotoLibraryErrorCode.PHOTO_NOT_FOUND;
import static art.yesulin.file.domain.FileErrorCode.METADATA_MISMATCH;

import art.yesulin.actor.application.page.ActorPageContentState;
import art.yesulin.actor.application.page.ActorPageContentSync;
import art.yesulin.actor.application.page.PublicPhotoCopyStorage;
import art.yesulin.actor.application.page.PublicPhotoCopyStorage.PreparedCopy;
import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryItem;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryRepository;
import art.yesulin.actor.domain.photolibrary.PhotoPublicCopyDeletion;
import art.yesulin.actor.domain.photolibrary.PhotoPublicCopyDeletionRepository;
import art.yesulin.actor.domain.photolibrary.PhotoPublicCopyRules;
import art.yesulin.actor.domain.photolibrary.PhotoPublicCopyUpload;
import art.yesulin.actor.domain.photolibrary.PhotoPublicCopyUploadRepository;
import art.yesulin.file.application.FileService;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 배우 페이지 공개 사진 사본 업로드. 화면이 보관함 원본을 줄여 저장소로 바로 올리고, 확정하면 사진에 붙인다. 사본은 공개로 설정한
 * 사진에만 붙이며, 사본이 있는 공개 사진이 하나 이상이어야 배우 페이지를 공개할 수 있다. 하루가 지나도록 확정하지 않은 업로드와
 * 떼어 낸 뒤 지우지 못한 사본은 정리 작업이 저장소에서 지운다.
 */
@Service
@RequiredArgsConstructor
public class PhotoPublicCopyService {

    /** 공개 전환 화면을 오래 열어 둘 수 있으므로 하루는 기다린 뒤 정리한다. */
    static final Duration UNCLAIMED_RETENTION = Duration.ofDays(1);
    private static final int CLEANUP_BATCH_SIZE = 200;

    private final ActorPageContentSync contentSync;
    private final PhotoLibraryRepository photoLibraryRepository;
    private final PhotoPublicCopyUploadRepository uploadRepository;
    private final PhotoPublicCopyDeletionRepository deletionRepository;
    private final PublicPhotoCopyStorage storage;
    private final FileService fileService;
    private final Clock clock;

    @Transactional
    public PhotoPublicCopyUploadResult prepareUpload(long ownerId, long photoId, String contentType, long size) {
        if (!PhotoPublicCopyRules.isAcceptedType(contentType)) {
            throw new BusinessException(INVALID_PUBLIC_COPY, "배우 페이지 사진은 JPG로 줄여서 올려야 합니다.");
        }
        if (!PhotoPublicCopyRules.isAcceptedSize(size)) {
            throw new BusinessException(
                    INVALID_PUBLIC_COPY, "배우 페이지 사진은 %dMB까지 올릴 수 있습니다.", PhotoPublicCopyRules.MAX_BYTES / 1024 / 1024
            );
        }
        photoLibraryRepository.findByOwnerId(ownerId)
                .orElseThrow(PhotoPublicCopyService::photoNotFound)
                .getPublicPhoto(photoId);
        PreparedCopy prepared = storage.prepare(size);
        uploadRepository.save(new PhotoPublicCopyUpload(
                prepared.objectKey(), ownerId, photoId, PhotoPublicCopyRules.CONTENT_TYPE, size, clock.instant()
        ));
        return PhotoPublicCopyUploadResult.of(prepared.upload(), prepared.objectKey());
    }

    /**
     * 올린 사본을 확인하고 사진에 붙인다. 이전 사본이 있으면 커밋 뒤 지운다. 응답을 받지 못해 같은 업로드 키로 다시 확정하면
     * 이미 붙은 사본을 그대로 돌려준다.
     */
    @Transactional
    public PhotoLibraryItemResult complete(long ownerId, long photoId, String uploadKey) {
        final ActorPageContentState pageState = contentSync.lock(ownerId);
        PhotoLibrary library = pageState.photos();
        if (library == null) {
            throw photoNotFound();
        }
        PhotoLibraryItem photo = library.getPublicPhoto(photoId);
        if (uploadKey.equals(photo.getPublicCopyObjectKey())) {
            if (!storage.reconfirm(uploadKey)) {
                throw uploadNotFinished();
            }
            return toResult(photo);
        }
        PhotoPublicCopyUpload upload = uploadRepository.findByObjectKey(uploadKey)
                .filter(candidate -> candidate.isClaimableBy(ownerId, photoId))
                .orElseThrow(() -> new BusinessException(INVALID_PUBLIC_COPY, "사진 사본을 찾을 수 없습니다. 다시 올려 주세요."));
        if (!storage.confirm(uploadKey, upload.getSize())) {
            throw uploadNotFinished();
        }
        library.attachPublicCopy(photoId, uploadKey);
        uploadRepository.delete(upload);
        contentSync.synchronize(pageState);
        return toResult(photo);
    }

    /** 확정하지 않은 채 하루가 지난 업로드를 지운다. 저장소에서 지우지 못한 것은 기록을 남겨 다음에 다시 시도한다. */
    @Transactional
    public int deleteUnclaimed() {
        List<PhotoPublicCopyUpload> expired = uploadRepository.findAllByCreatedAtBeforeOrderByIdAsc(
                clock.instant().minus(UNCLAIMED_RETENTION), PageRequest.of(0, CLEANUP_BATCH_SIZE)
        );
        List<PhotoPublicCopyUpload> deleted = expired.stream()
                .filter(upload -> storage.tryDelete(upload.getObjectKey()))
                .toList();
        uploadRepository.deleteAll(deleted);
        return deleted.size();
    }

    /** 사진에서 떼어 냈지만 커밋 뒤 지우지 못한 사본을 다시 지운다. 지운 사본만 기록을 지우고 CDN 캐시 무효화를 요청한다. */
    @Transactional
    public int retryFailedDeletions() {
        List<PhotoPublicCopyDeletion> pending = deletionRepository.findAllByOrderByIdAsc(
                PageRequest.of(0, CLEANUP_BATCH_SIZE)
        );
        List<String> deleted = storage.delete(pending.stream().map(PhotoPublicCopyDeletion::getObjectKey).toList());
        deletionRepository.deleteAll(pending.stream()
                .filter(deletion -> deleted.contains(deletion.getObjectKey()))
                .toList());
        return deleted.size();
    }

    private PhotoLibraryItemResult toResult(PhotoLibraryItem photo) {
        String publicCopyUrl = storage.publicUrl(photo.getPublicCopyObjectKey());
        return PhotoLibraryItemResult.from(photo, fileService.privateContentUrl(photo.getFileId()), publicCopyUrl);
    }

    private static BusinessException photoNotFound() {
        return new BusinessException(PHOTO_NOT_FOUND, "사진보관함에서 사진을 찾을 수 없습니다.");
    }

    /** 화면의 안전 업로드가 같은 주소로 한 번 더 올린 뒤 다시 확정한다. */
    private static BusinessException uploadNotFinished() {
        return new BusinessException(
                METADATA_MISMATCH, "사진 사본을 다 올리지 못했거나 JPG 파일이 아닙니다. 다시 올려 주세요."
        );
    }
}
