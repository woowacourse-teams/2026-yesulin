package art.yesulin.application.photolibrary;

import static art.yesulin.domain.file.FileErrorCode.NOT_FOUND;
import static art.yesulin.domain.photolibrary.PhotoLibraryErrorCode.PHOTO_NOT_FOUND;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReference;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.photolibrary.PhotoLibrary;
import art.yesulin.domain.photolibrary.PhotoLibraryItem;
import art.yesulin.domain.photolibrary.PhotoLibraryRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PhotoLibraryService {

    public static final String FILE_REFERENCE_TYPE = "PHOTO_LIBRARY_ITEM";

    private final PhotoLibraryRepository photoLibraryRepository;
    private final FileAssetRepository fileAssetRepository;
    private final FileReferenceRepository fileReferenceRepository;
    private final ObjectStorage objectStorage;
    private final Clock clock;

    @Transactional
    public PhotoLibraryItemResult addPhoto(long ownerId, AddPhotoToLibraryCommand command) {
        FileAsset fileAsset = findUsableOwnedFile(ownerId, command.fileId());
        PhotoLibrary library = photoLibraryRepository.findByOwnerIdForUpdate(ownerId)
                .orElseGet(() -> new PhotoLibrary(ownerId));
        library.addPhoto(fileAsset.getId());

        PhotoLibrary savedLibrary = photoLibraryRepository.saveAndFlush(library);
        PhotoLibraryItem savedItem = savedLibrary.getPhotos().getLast();
        fileReferenceRepository.save(new FileReference(FILE_REFERENCE_TYPE, savedItem.getId(), fileAsset.getId()));
        return toResult(savedItem, fileAsset);
    }

    @Transactional(readOnly = true)
    public PhotoLibraryResult findPhotos(long ownerId) {
        List<PhotoLibraryItem> items = findPhotoItems(ownerId);
        return toLibraryResult(items);
    }

    @Transactional
    public PhotoLibraryResult makeRepresentative(long ownerId, long photoId) {
        PhotoLibrary library = findOwnedLibraryForUpdate(ownerId);
        library.movePhotoToFront(photoId);
        return toLibraryResult(library.getPhotos());
    }

    @Transactional
    public void deletePhoto(long ownerId, long photoId) {
        PhotoLibrary library = findOwnedLibraryForUpdate(ownerId);
        PhotoLibraryItem deletedPhoto = library.deletePhoto(photoId, Instant.now(clock));
        fileReferenceRepository.deleteByReferenceTypeAndReferenceIdAndFileId(
                FILE_REFERENCE_TYPE,
                deletedPhoto.getId(),
                deletedPhoto.getFileId()
        );
    }

    private PhotoLibraryResult toLibraryResult(List<PhotoLibraryItem> items) {
        Map<Long, FileAsset> fileAssetsById = findFileAssetsById(items);
        return new PhotoLibraryResult(toResults(items, fileAssetsById));
    }

    private PhotoLibrary findOwnedLibraryForUpdate(long ownerId) {
        return photoLibraryRepository.findByOwnerIdForUpdate(ownerId)
                .orElseThrow(() -> new BusinessException(PHOTO_NOT_FOUND, "사진보관함에서 사진을 찾을 수 없습니다."));
    }

    private List<PhotoLibraryItem> findPhotoItems(long ownerId) {
        return photoLibraryRepository.findByOwnerId(ownerId)
                .map(PhotoLibrary::getPhotos)
                .orElseGet(List::of);
    }

    private Map<Long, FileAsset> findFileAssetsById(List<PhotoLibraryItem> items) {
        List<Long> fileIds = items.stream().map(PhotoLibraryItem::getFileId).toList();
        return fileAssetRepository.findAllById(fileIds).stream()
                .collect(Collectors.toMap(FileAsset::getId, Function.identity()));
    }

    private List<PhotoLibraryItemResult> toResults(
            List<PhotoLibraryItem> items,
            Map<Long, FileAsset> fileAssetsById
    ) {
        return items.stream()
                .map(item -> toResult(item, findFileAsset(fileAssetsById, item.getFileId())))
                .toList();
    }

    private FileAsset findFileAsset(Map<Long, FileAsset> fileAssets, long fileId) {
        FileAsset fileAsset = fileAssets.get(fileId);
        if (fileAsset == null) {
            throw new BusinessException(NOT_FOUND, "사진 파일을 찾을 수 없습니다.");
        }
        return fileAsset;
    }

    private PhotoLibraryItemResult toResult(PhotoLibraryItem item, FileAsset fileAsset) {
        return PhotoLibraryItemResult.from(item, objectStorage.toPublicUrl(fileAsset.getObjectKey()));
    }

    private FileAsset findUsableOwnedFile(long ownerId, long fileId) {
        FileAsset fileAsset = fileAssetRepository.findByIdAndOwnerId(fileId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다."));
        fileAsset.ensureUsable();
        return fileAsset;
    }
}
