package art.yesulin.event.application.registration;

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
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 참가 신청자의 프로필 사진을 비공개 경로({@code private/event-registration-photos/})에 둔다. 운영자는 잠깐 열리는 내려받기
 * 주소로만 본다. 형식·크기와 파일 앞부분 기준은 이벤트 이미지와 같다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EventRegistrationPhotoStorage {

    private static final DateTimeFormatter KEY_DATE = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);
    private static final String KEY_FORMAT = "private/event-registration-photos/%s/%s";
    private static final Pattern KEY = Pattern.compile(
            "private/event-registration-photos/[0-9]{8}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    );

    private final ObjectStorage storage;
    private final Clock clock;

    public PreparedPhoto prepare(String contentType, long size) {
        String objectKey = KEY_FORMAT.formatted(KEY_DATE.format(clock.instant()), UUID.randomUUID());
        return new PreparedPhoto(objectKey, storage.createUpload(objectKey, contentType, size));
    }

    /**
     * 브라우저가 약속한 형식·크기로 올렸고 파일 앞부분이 그 형식과 맞는지 확인한다.
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
        return content.isPresent()
                && EventImageRules.matchesSignature(contentType, head(content.get().bytes()));
    }

    /** 이 저장소가 만든 업로드 키 모양인지 본다. */
    public boolean isKey(String objectKey) {
        return objectKey != null && KEY.matcher(objectKey).matches();
    }

    public String downloadUrl(String objectKey) {
        return storage.createDownloadUrl(objectKey);
    }

    /** 지우지 못해도 요청을 실패시키지 않는다. 정리 작업이 다시 시도할 수 있게 결과를 알려 준다. */
    public boolean tryDelete(String objectKey) {
        try {
            storage.delete(objectKey);
            return true;
        } catch (RuntimeException exception) {
            log.warn("참가 신청 사진 정리 실패: {}", exception.getClass().getSimpleName());
            return false;
        }
    }

    private static byte[] head(byte[] bytes) {
        return Arrays.copyOf(bytes, Math.min(bytes.length, EventImageRules.SIGNATURE_LENGTH));
    }

    public record PreparedPhoto(String objectKey, PresignedUpload upload) {
    }
}
