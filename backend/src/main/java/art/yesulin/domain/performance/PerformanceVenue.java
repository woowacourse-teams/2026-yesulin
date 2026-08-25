package art.yesulin.domain.performance;

import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PerformanceVenue {

    @Column(name = "venue_name", nullable = false, length = 200)
    private String name;

    @Column(name = "road_address", nullable = false, length = 300)
    private String roadAddress;

    @Column(name = "detail_address", nullable = false, length = 300)
    private String detailAddress;

    @Column(name = "zonecode", nullable = false, length = 20)
    private String zonecode;

    @Column(name = "latitude", precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 10, scale = 7)
    private BigDecimal longitude;

    public PerformanceVenue(
            String name,
            String roadAddress,
            String detailAddress,
            String zonecode,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        validateCoordinates(latitude, longitude);
        this.name = requireText(name, "공연 장소명은 필수입니다.");
        this.roadAddress = requireText(roadAddress, "공연 도로명주소는 필수입니다.");
        this.detailAddress = normalizeOptional(detailAddress);
        this.zonecode = normalizeOptional(zonecode);
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public static PerformanceVenue fromRoadAddress(String roadAddress) {
        return new PerformanceVenue(roadAddress, roadAddress, "", "", null, null);
    }

    private void validateCoordinates(BigDecimal latitude, BigDecimal longitude) {
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("공연 장소의 위도와 경도는 함께 입력해야 합니다.");
        }
        if (latitude != null && (latitude.compareTo(BigDecimal.valueOf(-90)) < 0
                || latitude.compareTo(BigDecimal.valueOf(90)) > 0)) {
            throw new IllegalArgumentException("공연 장소의 위도는 -90 이상 90 이하여야 합니다.");
        }
        if (longitude != null && (longitude.compareTo(BigDecimal.valueOf(-180)) < 0
                || longitude.compareTo(BigDecimal.valueOf(180)) > 0)) {
            throw new IllegalArgumentException("공연 장소의 경도는 -180 이상 180 이하여야 합니다.");
        }
    }

    private String normalizeOptional(String value) {
        return value == null ? "" : value.trim();
    }
}
