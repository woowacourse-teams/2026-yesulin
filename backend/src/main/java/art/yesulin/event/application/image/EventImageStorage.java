package art.yesulin.event.application.image;

import art.yesulin.event.domain.image.EventImageRules;
import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.PresignedUpload;
import art.yesulin.file.application.storage.StoredObjectContent;
import art.yesulin.file.application.storage.StoredObjectMetadata;
import java.time.Clock;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 이벤트 이미지를 공개 경로({@code public/files/events/})에 둔다. 공연 포스터와 같은 {@code files} CDN 동작으로 제공하므로
 * CDN 설정을 바꾸지 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EventImageStorage {

    private static final DateTimeFormatter KEY_DATE = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);
    private static final String KEY_FORMAT = "public/files/events/%s/%s";
    private static final String UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
    private static final Pattern PUBLIC_URL_KEY = Pattern.compile("files/events/([0-9]{8})/(" + UUID_PATTERN + ")$");

    private final ObjectStorage storage;
    private final Clock clock;

    public PreparedImage prepare(String contentType, long size) {
        String objectKey = KEY_FORMAT.formatted(KEY_DATE.format(clock.instant()), UUID.randomUUID());
        return new PreparedImage(objectKey, storage.createUpload(objectKey, contentType, size));
    }

    /**
     * 브라우저가 약속한 형식·크기로 올렸고 파일 앞부분이 그 형식과 맞는지 확인한 뒤 바뀌지 않는 캐시 설정을 붙인다.
     *
     * @return 아직 올라오지 않았거나 형식·크기·내용이 다르면 false
     */
    public boolean confirm(String objectKey, String contentType, long size) {
        Optional<StoredObjectMetadata> stored = storage.inspect(objectKey);
        if (stored.isEmpty() || stored.get().size() != size
                || !contentType.equalsIgnoreCase(stored.get().contentType())) {
            return false;
        }
        Optional<StoredObjectContent> content = storage.read(objectKey);
        if (content.isEmpty() || !EventImageRules.matchesSignature(contentType, head(content.get().bytes()))) {
            return false;
        }
        storage.replaceHeaders(objectKey, contentType, null);
        return true;
    }

    public String publicUrl(String objectKey) {
        return storage.toPublicUrl(objectKey);
    }

    /** 이 저장소가 내려 준 이벤트 이미지 공개 주소에서 저장소 키를 꺼낸다. 다른 주소면 empty다. */
    public Optional<String> keyOf(String publicUrl) {
        Matcher matcher = publicUrl == null ? null : PUBLIC_URL_KEY.matcher(publicUrl);
        if (matcher == null || !matcher.find()) {
            return Optional.empty();
        }
        String objectKey = KEY_FORMAT.formatted(matcher.group(1), matcher.group(2));
        return storage.toPublicUrl(objectKey).equals(publicUrl) ? Optional.of(objectKey) : Optional.empty();
    }

    /** 지우지 못해도 요청을 실패시키지 않는다. 정리 작업이 다시 시도할 수 있게 결과를 알려 준다. */
    public boolean tryDelete(String objectKey) {
        try {
            storage.delete(objectKey);
            return true;
        } catch (RuntimeException exception) {
            log.warn("이벤트 이미지 정리 실패: {}", exception.getClass().getSimpleName());
            return false;
        }
    }

    private static byte[] head(byte[] bytes) {
        return Arrays.copyOf(bytes, Math.min(bytes.length, EventImageRules.SIGNATURE_LENGTH));
    }

    public record PreparedImage(String objectKey, PresignedUpload upload) {
    }
}
