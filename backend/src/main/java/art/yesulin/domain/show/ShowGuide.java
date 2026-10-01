package art.yesulin.domain.show;

import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.show.ShowErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 관객 화면의 오시는 길 아래에 보여 주는 추가 안내다. 기획사가 "주차 안내"처럼 제목을 직접 정하고 내용을 적는다.
 */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShowGuide {

    public static final int MAX_TITLE_LENGTH = 30;
    public static final int MAX_CONTENT_LENGTH = 1000;

    @Column(nullable = false, length = MAX_TITLE_LENGTH)
    private String title;

    @Column(nullable = false, length = MAX_CONTENT_LENGTH)
    private String content;

    public ShowGuide(String title, String content) {
        this.title = requireMaxLength(requireText(title, "추가 안내 제목은 필수입니다."), MAX_TITLE_LENGTH, "추가 안내 제목");
        this.content = requireMaxLength(
                requireText(content, "추가 안내 내용은 필수입니다."), MAX_CONTENT_LENGTH, "추가 안내 내용"
        );
    }

    private static String requireMaxLength(String value, int maxLength, String fieldName) {
        if (value.length() > maxLength) {
            throw new BusinessException(INVALID_INPUT, "%s은(는) %d자를 넘을 수 없습니다.", fieldName, maxLength);
        }
        return value;
    }
}
