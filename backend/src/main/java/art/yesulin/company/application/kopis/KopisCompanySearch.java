package art.yesulin.company.application.kopis;

import java.util.List;

/** KOPIS 기획제작사를 이름으로 찾는다. 인증키가 없거나 KOPIS를 부르지 못하면 {@link KopisUnavailableException}을 던진다. */
public interface KopisCompanySearch {

    List<KopisCompany> searchByName(String name);
}
