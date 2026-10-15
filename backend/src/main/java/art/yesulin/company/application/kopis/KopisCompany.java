package art.yesulin.company.application.kopis;

import java.util.List;

/**
 * 공연예술통합전산망(KOPIS)에 등록된 기획·제작사. 운영자가 공연사 정보를 쓸 때 처음 값으로만 쓰고, 확인한 뒤 고쳐 저장한다.
 *
 * @param kopisId KOPIS 기획제작사 ID(예: {@code AG019413})
 * @param phone 비어 있으면 null이다.
 * @param homepage 비어 있으면 null이다.
 * @param recentWorks KOPIS에 등록된 최근 작품 이름
 */
public record KopisCompany(
        String kopisId,
        String name,
        String genre,
        String phone,
        String homepage,
        List<String> recentWorks
) {
}
