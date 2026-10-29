package art.yesulin.actor.domain.photolibrary;

import java.util.Locale;

/**
 * 배우 페이지 공개 사본 형식·크기 기준. 화면이 보관함 원본을 긴 변 1600px JPEG로 줄여 올리므로 JPEG만 받고, 크기 상한은
 * 공연사 대표 사진과 같게 넉넉히 둔다. 저장소에 올라온 뒤에는 실제 파일 앞부분이 JPEG인지 확인한다.
 */
public final class PhotoPublicCopyRules {

    public static final String CONTENT_TYPE = "image/jpeg";
    public static final long MAX_BYTES = 10L * 1024 * 1024;

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};

    private PhotoPublicCopyRules() {
    }

    /** 알린 형식이 JPEG인지 본다. {@code image/jpeg; charset=...}처럼 붙은 값은 무시한다. */
    public static boolean isAcceptedType(String reported) {
        if (reported == null) {
            return false;
        }
        int separator = reported.indexOf(';');
        String type = separator < 0 ? reported : reported.substring(0, separator);
        return CONTENT_TYPE.equals(type.trim().toLowerCase(Locale.ROOT));
    }

    public static boolean isAcceptedSize(long size) {
        return size > 0 && size <= MAX_BYTES;
    }

    /** 파일 앞부분이 JPEG인지 본다. 확장자만 바꾼 파일이나 이미지가 아닌 파일을 거른다. */
    public static boolean startsLikeJpeg(byte[] content) {
        if (content == null || content.length < JPEG.length) {
            return false;
        }
        for (int index = 0; index < JPEG.length; index++) {
            if (content[index] != JPEG[index]) {
                return false;
            }
        }
        return true;
    }
}
