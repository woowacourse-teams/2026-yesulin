package art.yesulin.company.presentation.api.admin;

import art.yesulin.company.domain.Company;
import art.yesulin.company.domain.CompanyAddress;
import art.yesulin.company.domain.CompanyProfile;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 공연사 정보를 통째로 저장한다. 이름 말고는 비워 둘 수 있고, 비운 항목은 지운다.
 *
 * @param representativeNamePublic 공연사가 대표자 이름 공개에 동의했는지. false면 공개 화면에 대표자 이름이 없다.
 * @param address 도로명주소를 비우면 주소를 지운다.
 * @param addressPublic 공식 사업장 주소라 상세 주소와 지도를 공개할지. false면 시·군·구까지만 보인다.
 * @param sourceNote 정보를 확인한 출처. 운영자만 본다.
 */
public record WriteCompanyRequest(
        @NotBlank @Size(max = Company.MAX_NAME_LENGTH) String name,
        @Size(max = Company.MAX_REPRESENTATIVE_NAME_LENGTH) String representativeName,
        boolean representativeNamePublic,
        @Size(max = Company.MAX_LINKS) List<@Size(max = Company.MAX_LINK_LENGTH) String> links,
        LocalDate foundedOn,
        @Valid Address address,
        boolean addressPublic,
        @Size(max = Company.MAX_REGION_LENGTH) String region,
        @Size(max = Company.MAX_PHONE_LENGTH) String phone,
        @Size(max = Company.MAX_DESCRIPTION_LENGTH) String description,
        @Size(max = Company.MAX_HISTORY_LENGTH) String history,
        @Size(max = Company.MAX_SOURCE_NOTE_LENGTH) String sourceNote
) {

    public CompanyProfile toProfile() {
        return new CompanyProfile(
                name, representativeName, representativeNamePublic, links, foundedOn,
                address == null ? null : address.toAddress(), addressPublic, region, phone, description, history,
                sourceNote
        );
    }

    public record Address(
            @Size(max = 300) String roadAddress,
            @Size(max = 300) String detailAddress,
            @Size(max = 20) String zonecode,
            BigDecimal latitude,
            BigDecimal longitude
    ) {

        CompanyAddress toAddress() {
            if (roadAddress == null || roadAddress.isBlank()) {
                return null;
            }
            return new CompanyAddress(roadAddress, detailAddress, zonecode, latitude, longitude);
        }
    }
}
