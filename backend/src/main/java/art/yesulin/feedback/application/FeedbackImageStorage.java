package art.yesulin.feedback.application;

import art.yesulin.feedback.domain.FeedbackErrorCode;
import art.yesulin.feedback.domain.FeedbackImage;
import art.yesulin.feedback.domain.FeedbackImageRules;
import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.global.exception.BusinessException;
import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 의견 첨부 이미지를 비공개 경로({@code private/feedback-images/})에 둔다. 운영자는 잠깐 열리는 주소로만 본다.
 * 서버 업로드의 기본 캐시는 공개 1년이라, 올린 직후 브라우저·중간 캐시에 남지 않게 {@code private, no-store}로 바꾼다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FeedbackImageStorage {

    private static final DateTimeFormatter KEY_DATE = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);
    private static final String KEY_FORMAT = "private/feedback-images/%s/%s";
    private static final String PRIVATE_CACHE_CONTROL = "private, no-store";
    private static final String INVALID_MESSAGE = "사진은 JPG·PNG·WebP로 한 장 5MB, 최대 3장까지 보낼 수 있어요.";

    private final ObjectStorage storage;
    private final Clock clock;

    /** 형식·크기·장수를 모두 확인한 뒤에 올린다. 하나라도 맞지 않으면 아무것도 올리지 않는다. */
    public List<FeedbackImage> store(List<FeedbackImageFile> files) {
        if (files.size() > FeedbackImageRules.MAX_COUNT) {
            throw invalid();
        }
        List<String> types = files.stream().map(FeedbackImageStorage::verifiedType).toList();
        List<FeedbackImage> stored = new ArrayList<>();
        for (int index = 0; index < files.size(); index++) {
            stored.add(upload(files.get(index), types.get(index), stored));
        }
        return List.copyOf(stored);
    }

    public String downloadUrl(FeedbackImage image) {
        return storage.createDownloadUrl(image.getObjectKey());
    }

    /** 저장에 실패한 의견의 이미지를 치운다. 지우지 못해도 원래 오류를 가리지 않는다. */
    public void deleteQuietly(List<FeedbackImage> images) {
        images.forEach(this::deleteOne);
    }

    private FeedbackImage upload(FeedbackImageFile file, String contentType, List<FeedbackImage> stored) {
        String objectKey = KEY_FORMAT.formatted(KEY_DATE.format(clock.instant()), UUID.randomUUID());
        try {
            storage.put(objectKey, new ObjectUpload(contentType, null, file.size(),
                    new ByteArrayInputStream(file.content())));
            storage.replaceHeaders(objectKey, contentType, null, PRIVATE_CACHE_CONTROL);
        } catch (RuntimeException exception) {
            deleteQuietly(stored);
            throw exception;
        }
        return new FeedbackImage(objectKey, contentType, file.size());
    }

    private void deleteOne(FeedbackImage image) {
        try {
            storage.delete(image.getObjectKey());
        } catch (RuntimeException exception) {
            log.warn("의견 이미지 정리 실패: {}", exception.getClass().getSimpleName());
        }
    }

    private static String verifiedType(FeedbackImageFile file) {
        String type = FeedbackImageRules.contentType(file.reportedType()).orElseThrow(FeedbackImageStorage::invalid);
        if (file.size() == 0 || file.size() > FeedbackImageRules.MAX_BYTES
                || !FeedbackImageRules.matchesSignature(type, file.content())) {
            throw invalid();
        }
        return type;
    }

    private static BusinessException invalid() {
        return new BusinessException(FeedbackErrorCode.INVALID_IMAGE, INVALID_MESSAGE);
    }
}
