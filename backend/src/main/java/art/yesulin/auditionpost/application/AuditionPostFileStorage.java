package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.file.application.storage.PresignedUpload;
import art.yesulin.file.application.storage.StoredObjectMetadata;
import java.io.InputStream;
import java.time.Clock;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 공고 사진·첨부파일을 공고 전용 공개 경로에 두고 지운다. 서버가 원문에서 받아 올리는 파일과 브라우저가 바로 올리는 파일이
 * 같은 경로와 객체 설정을 쓰도록 한곳에서 정한다. 이 파일은 {@code file_assets}에 기록하지 않고
 * {@code audition_post_files}가 키를 소유한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuditionPostFileStorage {

    private static final DateTimeFormatter KEY_DATE = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);
    /** 공고 전용 공개 경로. CloudFront의 환경별 공고 동작으로 제공한다. */
    private static final String OBJECT_KEY_FORMAT = "public/audition-posts/%s/%s";
    private static final Pattern PUBLIC_URL_KEY = Pattern.compile(
            "audition-posts/([0-9]{8})/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$"
    );

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
        AuditionPostFile file = new AuditionPostFile(kind, newObjectKey(), filename, contentType, size);
        storage.put(file.getObjectKey(), new ObjectUpload(contentType, dispositionOf(file), size, content));
        return file;
    }

    /**
     * 브라우저가 서버를 거치지 않고 올릴 자리를 만든다. 브라우저는 형식만 서명된 주소로 올리고,
     * 내려받기 이름과 캐시 설정은 {@link #confirmUpload(AuditionPostFile)}가 붙인다.
     */
    public PreparedUpload prepareUpload(AuditionPostFileKind kind, String filename, String contentType, long size) {
        AuditionPostFile file = new AuditionPostFile(kind, newObjectKey(), filename, contentType, size);
        PresignedUpload upload = storage.createUpload(file.getObjectKey(), contentType, size);
        return new PreparedUpload(file, upload, publicUrl(file));
    }

    /**
     * 브라우저가 올린 파일이 약속한 형식·크기로 올라왔는지 확인하고, 서버가 올린 파일과 같은 헤더를 붙인다.
     *
     * @return 아직 올라오지 않았거나 형식·크기가 다르면 false
     */
    public boolean confirmUpload(AuditionPostFile file) {
        Optional<StoredObjectMetadata> stored = storage.inspect(file.getObjectKey());
        if (stored.isEmpty() || stored.get().size() != file.getSize()
                || !file.getContentType().equalsIgnoreCase(stored.get().contentType())) {
            return false;
        }
        storage.replaceHeaders(file.getObjectKey(), file.getContentType(), dispositionOf(file));
        return true;
    }

    public String publicUrl(AuditionPostFile file) {
        return storage.toPublicUrl(file.getObjectKey());
    }

    /** 이 저장소가 내려 준 공고 파일 공개 주소에서 저장소 키를 꺼낸다. 다른 주소면 empty다. */
    public Optional<String> objectKeyOf(String publicUrl) {
        Matcher matcher = publicUrl == null ? null : PUBLIC_URL_KEY.matcher(publicUrl);
        if (matcher == null || !matcher.find()) {
            return Optional.empty();
        }
        String objectKey = OBJECT_KEY_FORMAT.formatted(matcher.group(1), matcher.group(2));
        return storage.toPublicUrl(objectKey).equals(publicUrl) ? Optional.of(objectKey) : Optional.empty();
    }

    /** 실패한 요청의 정리나 커밋 뒤 정리에 쓴다. 지우지 못해도 요청을 실패시키지 않는다. */
    public void deleteQuietly(List<String> objectKeys) {
        objectKeys.forEach(this::tryDelete);
    }

    /**
     * 저장소 객체 하나를 지운다. 실패는 기록만 하고, 호출자가 다음에 다시 시도할 수 있게 결과를 알려 준다.
     *
     * @return 지웠으면 true
     */
    public boolean tryDelete(String objectKey) {
        try {
            storage.delete(objectKey);
            return true;
        } catch (RuntimeException exception) {
            log.warn("공고 파일 정리 실패: {}", exception.getClass().getSimpleName());
            return false;
        }
    }

    private String newObjectKey() {
        return OBJECT_KEY_FORMAT.formatted(KEY_DATE.format(clock.instant()), UUID.randomUUID());
    }

    private static String dispositionOf(AuditionPostFile file) {
        return file.isImage() ? null : AuditionPostFileRules.attachmentDisposition(file.getOriginalFilename());
    }

    public record PreparedUpload(AuditionPostFile file, PresignedUpload upload, String publicUrl) {
    }
}
