package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.ObjectUpload;
import java.io.InputStream;
import java.time.Clock;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 공고 사진·첨부파일을 공고 전용 공개 경로에 두고 지운다. 원문에서 가져온 파일과 직접 올린 파일이 같은 경로와 객체 설정을
 * 쓰도록 한곳에서 정한다. 이 파일은 {@code file_assets}에 기록하지 않고 {@code audition_post_files}가 키를 소유한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuditionPostFileStorage {

    private static final DateTimeFormatter KEY_DATE = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);
    /** 공고 전용 공개 경로. CloudFront의 환경별 공고 동작으로 제공한다. */
    private static final String OBJECT_KEY_FORMAT = "public/audition-posts/%s/%s";

    private final ObjectStorage storage;
    private final Clock clock;

    /**
     * 서버가 받은 파일을 그대로 올린다. 첨부는 브라우저가 열지 않고 원래 이름으로 내려받게 한다.
     * 파일 정보를 먼저 검증하므로 잘못된 파일은 올리지 않는다.
     */
    public AuditionPostFile store(
            AuditionPostFileKind kind,
            String filename,
            String contentType,
            long size,
            InputStream content
    ) {
        String objectKey = OBJECT_KEY_FORMAT.formatted(KEY_DATE.format(clock.instant()), UUID.randomUUID());
        AuditionPostFile file = new AuditionPostFile(kind, objectKey, filename, contentType, size);
        String disposition = file.isImage() ? null : AuditionPostFileRules.attachmentDisposition(filename);
        storage.put(objectKey, new ObjectUpload(contentType, disposition, size, content));
        return file;
    }

    public String publicUrl(AuditionPostFile file) {
        return storage.toPublicUrl(file.getObjectKey());
    }

    /** 실패한 요청의 정리나 커밋 뒤 정리에 쓴다. 지우지 못해도 요청을 실패시키지 않는다. */
    public void deleteQuietly(List<String> objectKeys) {
        for (String objectKey : objectKeys) {
            try {
                storage.delete(objectKey);
            } catch (RuntimeException exception) {
                log.warn("가져온 공고 파일 정리 실패: {}", exception.getClass().getSimpleName());
            }
        }
    }
}
