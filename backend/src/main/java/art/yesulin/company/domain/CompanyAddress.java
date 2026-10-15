package art.yesulin.company.domain;

import static art.yesulin.company.domain.CompanyErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 공연사가 직접 알려 준 사무실·연습실 주소. 지도는 이 주소만 사용하고 최근 공연 장소는 따로 보여 준다. */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompanyAddress {

    private static final int MAX_ADDRESS_LENGTH = 300;
    private static final int MAX_ZONECODE_LENGTH = 20;
    private static final int DISTRICT_WORDS = 2;

    @Column(name = "road_address", length = MAX_ADDRESS_LENGTH)
    private String roadAddress;

    @Column(name = "detail_address", length = MAX_ADDRESS_LENGTH)
    private String detailAddress;

    @Column(name = "zonecode", length = MAX_ZONECODE_LENGTH)
    private String zonecode;

    @Column(name = "latitude", precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 10, scale = 7)
    private BigDecimal longitude;

    public CompanyAddress(
            String roadAddress,
            String detailAddress,
            String zonecode,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        this.roadAddress = limit(roadAddress, MAX_ADDRESS_LENGTH, "도로명주소");
        if (this.roadAddress.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "도로명주소는 필수입니다.");
        }
        this.detailAddress = limit(detailAddress, MAX_ADDRESS_LENGTH, "상세 주소");
        this.zonecode = limit(zonecode, MAX_ZONECODE_LENGTH, "우편번호");
        validateCoordinates(latitude, longitude);
        this.latitude = latitude;
        this.longitude = longitude;
    }

    /** 공고 카드에 보일 시·도와 시·군·구. 예: {@code 서울 종로구 대학로 12} → {@code 서울 종로구} */
    public String district() {
        return Arrays.stream(roadAddress.trim().split("\\s+"))
                .limit(DISTRICT_WORDS)
                .collect(Collectors.joining(" "));
    }

    private static String limit(String value, int maxLength, String label) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() > maxLength) {
            throw new BusinessException(INVALID_INPUT, "%s는 %d자 이내여야 합니다.", label, maxLength);
        }
        return normalized;
    }

    private static void validateCoordinates(BigDecimal latitude, BigDecimal longitude) {
        if ((latitude == null) != (longitude == null)) {
            throw new BusinessException(INVALID_INPUT, "위도와 경도는 함께 입력해야 합니다.");
        }
        if (latitude != null && (latitude.abs().compareTo(BigDecimal.valueOf(90)) > 0
                || longitude.abs().compareTo(BigDecimal.valueOf(180)) > 0)) {
            throw new BusinessException(INVALID_INPUT, "좌표가 올바르지 않습니다.");
        }
    }
}
