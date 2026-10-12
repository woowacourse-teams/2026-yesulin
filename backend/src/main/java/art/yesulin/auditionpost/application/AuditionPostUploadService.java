package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.FILE_REJECTED;

import art.yesulin.auditionpost.application.AuditionPostFileStorage.PreparedUpload;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.auditionpost.domain.upload.AuditionPostUpload;
import art.yesulin.auditionpost.domain.upload.AuditionPostUploadRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 공고 사진·첨부를 브라우저가 저장소로 바로 올리게 하고, 공고를 저장할 때 올린 사람의 업로드만 공고 파일로 확정한다.
 * 형식과 크기 기준은 원문에서 가져올 때와 같다. 하루가 지나도록 확정하지 않은 업로드는 저장소에서 지운다.
 */
@Service
@RequiredArgsConstructor
public class AuditionPostUploadService {

    /** 작성 화면을 오래 열어 둘 수 있으므로 하루는 기다린 뒤 정리한다. */
    static final Duration UNCLAIMED_RETENTION = Duration.ofDays(1);
    private static final int CLEANUP_BATCH_SIZE = 200;

    private final AuditionPostUploadRepository repository;
    private final AuditionPostFileStorage fileStorage;
    private final Clock clock;

    @Transactional
    public AuditionPostUploadResult prepare(
            long uploaderId,
            AuditionPostFileKind kind,
            String filename,
            String reportedType,
            long size
    ) {
        String contentType = switch (kind) {
            case IMAGE -> AuditionPostFileRules.imageContentType(reportedType, filename).orElseThrow(() ->
                    new BusinessException(FILE_REJECTED, "사진은 JPEG·PNG·GIF·WebP만 올릴 수 있습니다."));
            case ATTACHMENT -> AuditionPostFileRules.attachmentContentType(filename).orElseThrow(() ->
                    new BusinessException(FILE_REJECTED, "첨부는 문서·악보·음원 형식만 올릴 수 있습니다: %s", filename));
        };
        long maxBytes = kind == AuditionPostFileKind.IMAGE
                ? AuditionPostFileRules.MAX_IMAGE_BYTES
                : AuditionPostFileRules.MAX_ATTACHMENT_BYTES;
        if (size > maxBytes) {
            throw new BusinessException(FILE_REJECTED, "'%s'이(가) %dMB를 넘습니다.", filename, maxBytes / 1024 / 1024);
        }
        PreparedUpload prepared = fileStorage.prepareUpload(kind, filename, contentType, size);
        repository.save(new AuditionPostUpload(prepared.file(), uploaderId, clock.instant()));
        return AuditionPostUploadResult.from(prepared);
    }

    /**
     * 공고를 저장하는 트랜잭션 안에서 부른다. 주소가 이 사람이 올린 같은 종류의 업로드면 공고 파일로 확정하고 기록을 지운다.
     *
     * @return 이 사람의 업로드가 아니면 empty
     */
    public Optional<AuditionPostFile> claim(long uploaderId, String publicUrl, AuditionPostFileKind kind) {
        Optional<AuditionPostUpload> upload = fileStorage.objectKeyOf(publicUrl)
                .flatMap(repository::findByObjectKey)
                .filter(candidate -> candidate.isUploadedBy(uploaderId) && candidate.getKind() == kind);
        if (upload.isEmpty()) {
            return Optional.empty();
        }
        AuditionPostFile file = upload.get().toFile();
        if (!fileStorage.confirmUpload(file)) {
            throw new BusinessException(
                    FILE_REJECTED, "'%s'을(를) 다 올리지 못했습니다. 다시 올려 주세요.", file.getOriginalFilename()
            );
        }
        repository.delete(upload.get());
        return Optional.of(file);
    }

    /** 확정하지 않은 채 하루가 지난 업로드를 지운다. 저장소에서 지우지 못한 것은 기록을 남겨 다음에 다시 시도한다. */
    @Transactional
    public int deleteUnclaimed() {
        List<AuditionPostUpload> expired = repository.findAllByCreatedAtBeforeOrderByIdAsc(
                clock.instant().minus(UNCLAIMED_RETENTION), PageRequest.of(0, CLEANUP_BATCH_SIZE)
        );
        List<AuditionPostUpload> deleted = expired.stream()
                .filter(upload -> fileStorage.tryDelete(upload.getObjectKey()))
                .toList();
        repository.deleteAll(deleted);
        return deleted.size();
    }
}
