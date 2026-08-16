package art.yesulin.domain.file;

import static art.yesulin.domain.file.FileErrorCode.UNSUPPORTED_CONTENT_TYPE;

import art.yesulin.common.exception.BusinessException;
import java.util.Arrays;
import java.util.Set;

public enum FileType {

    IMAGE(Set.of("image/jpeg", "image/png", "image/webp"));

    private final Set<String> contentTypes;

    FileType(Set<String> contentTypes) {
        this.contentTypes = contentTypes;
    }

    public static FileType from(String contentType) {
        return Arrays.stream(values())
                .filter(type -> type.contentTypes.contains(contentType))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        UNSUPPORTED_CONTENT_TYPE, "지원하지 않는 파일 형식입니다: %s", contentType
                ));
    }
}
