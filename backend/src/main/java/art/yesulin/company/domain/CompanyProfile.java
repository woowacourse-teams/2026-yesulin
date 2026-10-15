package art.yesulin.company.domain;

import java.time.LocalDate;
import java.util.List;

/**
 * 운영자나 공연사가 고칠 수 있는 공연사 정보. 이름 말고는 모두 비워 둘 수 있다.
 *
 * @param representativeName 대표자 이름. 개인정보라 {@code representativeNamePublic}이 true일 때만 공개한다.
 * @param representativeNamePublic 공연사가 대표자 이름 공개에 동의했거나 직접 알려 줬는지
 * @param links 홈페이지·SNS 같은 링크. 최대 3개이고 빈 칸은 뺀다.
 * @param address 공연사가 알려 준 주소. 없으면 null이다.
 * @param addressPublic 상세 주소와 지도를 공개할지. 공식 사업장 주소일 때만 true로 두고, 아니면 시·군·구까지만 보인다.
 * @param region 주소가 없을 때 대신 보일 지역(예: {@code 서울}).
 * @param history 연혁. 줄바꿈을 그대로 보여 준다.
 * @param sourceNote 정보를 어디서 확인했는지 남기는 운영자 메모. 공개하지 않는다.
 */
public record CompanyProfile(
        String name,
        String representativeName,
        boolean representativeNamePublic,
        List<String> links,
        LocalDate foundedOn,
        CompanyAddress address,
        boolean addressPublic,
        String region,
        String phone,
        String description,
        String history,
        String sourceNote
) {

    /** 이름만 있는 공연사. 원문 작성자로 공연사를 만들 때 쓴다. */
    public static CompanyProfile named(String name) {
        return new CompanyProfile(name, null, false, List.of(), null, null, false, null, null, null, null, null);
    }
}
