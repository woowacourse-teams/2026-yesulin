package art.yesulin.auditionpost.application;

import art.yesulin.company.application.AdminCompanyResult;

/**
 * 운영자 공고 목록에서 그 공고의 공연사 정보를 쓰는 화면.
 *
 * @param company 이 공고의 공연사. 공고에 연결이 없으면 같은 원문 작성자로 묶은 공연사를 찾아 준다. 둘 다 없으면 null이다.
 * @param sharedByAuthor 공고에 연결되지 않았지만 같은 원문 작성자로 이전에 쓴 정보를 찾았는지
 * @param suggestedName 새로 쓸 때 이름 칸에 미리 넣을 원문 작성자 이름
 * @param sourceAuthorId 원문 작성자 번호. 있으면 저장할 때 같은 작성자의 다른 공고와 이후 공고에도 이 정보가 연결된다.
 */
public record AuditionPostCompanyProfile(
        AdminCompanyResult company,
        boolean sharedByAuthor,
        String suggestedName,
        String sourceAuthorId
) {
}
