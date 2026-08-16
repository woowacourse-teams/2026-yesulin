package art.yesulin.domain.performance;

import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoadAddress {

    @Column(name = "road_address", nullable = false, length = 300)
    private String value;

    public RoadAddress(String value) {
        this.value = requireText(value, "공연 도로명주소는 필수입니다.");
    }
}
