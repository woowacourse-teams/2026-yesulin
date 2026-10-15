package art.yesulin.company.application.photo;

import art.yesulin.company.domain.photo.CompanyPhotoRules;
import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.file.application.storage.PresignedUpload;
import art.yesulin.file.application.storage.StoredObjectContent;
import art.yesulin.file.application.storage.StoredObjectMetadata;
import java.io.ByteArrayInputStream;
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
 * 공연사 사진을 저장소에 둔다. 운영자가 올린 사진은 공개 경로({@code public/files/companies/})에 바로 두고, 수정 요청과 함께 누구나
 * 올린 사진은 운영자가 적용하기 전까지 비공개 경로({@code private/company-photos/})에 둔다. 공개 경로는 공연 포스터와 같은
 * {@code files} CDN 동작으로 제공한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CompanyPhotoStorage {

    private static final DateTimeFormatter KEY_DATE = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);
    private static final String PUBLIC_KEY_FORMAT = "public/files/companies/%s/%s";
    private static final String PRIVATE_KEY_FORMAT = "private/company-photos/%s/%s";
    private static final String UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
    private static final Pattern PUBLIC_URL_KEY = Pattern.compile("files/companies/([0-9]{8})/(" + UUID_PATTERN + ")$");
    private static final Pattern PRIVATE_KEY = Pattern.compile("private/company-photos/[0-9]{8}/" + UUID_PATTERN);

    private final ObjectStorage storage;
    private final Clock clock;

    public PreparedPhoto prepare(boolean publicPhoto, String contentType, long size) {
        String objectKey = newKey(publicPhoto ? PUBLIC_KEY_FORMAT : PRIVATE_KEY_FORMAT);
        return new PreparedPhoto(objectKey, storage.createUpload(objectKey, contentType, size));
    }

    /**
     * 브라우저가 약속한 형식·크기로 올렸고 파일 앞부분이 그 형식과 맞는지 확인한다. 공개 사진에는 바뀌지 않는 캐시 설정을 붙인다.
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
        if (content.isEmpty() || !CompanyPhotoRules.matchesSignature(contentType, head(content.get().bytes()))) {
            return false;
        }
        if (isPublic(objectKey)) {
            storage.replaceHeaders(objectKey, contentType, null);
        }
        return true;
    }

    /** 수정 요청의 비공개 사진을 공개 경로로 복사하고 새 공개 키를 준다. 원본은 호출한 쪽이 커밋 뒤 지운다. */
    public String publish(String privateKey) {
        StoredObjectContent content = storage.read(privateKey)
                .orElseThrow(() -> new IllegalStateException("수정 요청 사진을 찾을 수 없습니다."));
        String publicKey = newKey(PUBLIC_KEY_FORMAT);
        byte[] bytes = content.bytes();
        storage.put(publicKey, new ObjectUpload(
                content.contentType(), null, bytes.length, new ByteArrayInputStream(bytes)
        ));
        return publicKey;
    }

    public Optional<StoredObjectContent> read(String objectKey) {
        return storage.read(objectKey);
    }

    public String publicUrl(String objectKey) {
        return storage.toPublicUrl(objectKey);
    }

    /** 이 저장소가 내려 준 공연사 사진 공개 주소에서 저장소 키를 꺼낸다. 다른 주소면 empty다. */
    public Optional<String> publicKeyOf(String publicUrl) {
        Matcher matcher = publicUrl == null ? null : PUBLIC_URL_KEY.matcher(publicUrl);
        if (matcher == null || !matcher.find()) {
            return Optional.empty();
        }
        String objectKey = PUBLIC_KEY_FORMAT.formatted(matcher.group(1), matcher.group(2));
        return storage.toPublicUrl(objectKey).equals(publicUrl) ? Optional.of(objectKey) : Optional.empty();
    }

    /** 수정 요청 업로드 키가 이 저장소가 만든 비공개 사진 키 모양인지 본다. */
    public boolean isPrivateKey(String objectKey) {
        return objectKey != null && PRIVATE_KEY.matcher(objectKey).matches();
    }

    /** 지우지 못해도 요청을 실패시키지 않는다. 정리 작업이 다시 시도할 수 있게 결과를 알려 준다. */
    public boolean tryDelete(String objectKey) {
        try {
            storage.delete(objectKey);
            return true;
        } catch (RuntimeException exception) {
            log.warn("공연사 사진 정리 실패: {}", exception.getClass().getSimpleName());
            return false;
        }
    }

    private static boolean isPublic(String objectKey) {
        return objectKey.startsWith("public/");
    }

    private static byte[] head(byte[] bytes) {
        return Arrays.copyOf(bytes, Math.min(bytes.length, CompanyPhotoRules.SIGNATURE_LENGTH));
    }

    private String newKey(String format) {
        return format.formatted(KEY_DATE.format(clock.instant()), UUID.randomUUID());
    }

    public record PreparedPhoto(String objectKey, PresignedUpload upload) {
    }
}
