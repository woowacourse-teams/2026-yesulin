package art.yesulin.domain.audition.schedule;

import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 연습·오디션 장소에 공통으로 쓰는 선택 주소 정보다. */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionVenue {

    @Column(length = 200)
    private String name;

    @Column(length = 300)
    private String roadAddress;

    @Column(length = 300)
    private String detailAddress;

    @Column(length = 20)
    private String zonecode;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    public AuditionVenue(
            String name,
            String roadAddress,
            String detailAddress,
            String zonecode,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        boolean empty = isBlank(name) && isBlank(roadAddress);
        if (!empty) {
            this.name = requireText(name, "장소명은 필수입니다.");
            this.roadAddress = requireText(roadAddress, "도로명주소는 필수입니다.");
        } else {
            this.name = "";
            this.roadAddress = "";
        }
        this.detailAddress = normalize(detailAddress);
        this.zonecode = normalize(zonecode);
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("위도와 경도는 함께 입력해야 합니다.");
        }
        this.latitude = latitude;
        this.longitude = longitude;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
