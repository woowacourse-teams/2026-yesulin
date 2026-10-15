package art.yesulin.company.application;

import art.yesulin.company.domain.CompanyAddress;
import java.math.BigDecimal;

/** 공연사가 직접 알려 준 주소. 좌표가 없으면 화면이 주소로 지도를 찾는다. */
public record CompanyAddressResult(
        String roadAddress,
        String detailAddress,
        String zonecode,
        BigDecimal latitude,
        BigDecimal longitude
) {

    static CompanyAddressResult from(CompanyAddress address) {
        if (address == null) {
            return null;
        }
        return new CompanyAddressResult(
                address.getRoadAddress(),
                address.getDetailAddress(),
                address.getZonecode(),
                address.getLatitude(),
                address.getLongitude()
        );
    }
}
