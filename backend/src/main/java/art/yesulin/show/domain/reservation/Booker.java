package art.yesulin.show.domain.reservation;

import static art.yesulin.global.validation.DomainValidator.requireText;
import static art.yesulin.show.domain.reservation.ReservationErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 예매자 연락 정보다. 로그인 예매를 도입하면 회원 ID를 이 값 객체에 추가하고 비회원은 null로 둔다.
 */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Booker {

    private static final int MAX_NAME_LENGTH = 50;
    private static final String PHONE_PATTERN = "\\d{3}-\\d{4}-\\d{4}";

    @Column(name = "booker_name", nullable = false, updatable = false, length = MAX_NAME_LENGTH)
    private String name;

    @Column(name = "booker_phone", nullable = false, updatable = false, length = 13)
    private String phone;

    public Booker(String name, String phone) {
        this.name = requireName(name);
        this.phone = requirePhone(phone);
    }

    private static String requireName(String name) {
        String normalized = requireText(name, "예매자 이름은 필수입니다.");
        if (normalized.length() > MAX_NAME_LENGTH) {
            throw new BusinessException(INVALID_INPUT, "예매자 이름은 50자를 넘을 수 없습니다.");
        }
        return normalized;
    }

    private static String requirePhone(String phone) {
        String normalized = requireText(phone, "예매자 휴대폰 번호는 필수입니다.");
        if (!normalized.matches(PHONE_PATTERN)) {
            throw new BusinessException(INVALID_INPUT, "휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요.");
        }
        return normalized;
    }
}
