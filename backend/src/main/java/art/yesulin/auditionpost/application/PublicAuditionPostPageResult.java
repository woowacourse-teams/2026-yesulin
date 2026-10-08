package art.yesulin.auditionpost.application;

import java.util.List;

/**
 * 공고 목록 한 페이지.
 *
 * @param page 0부터 시작하는 현재 페이지
 * @param totalElements 현재 조건(모집 중만 또는 마감 포함)의 전체 건수
 * @param openCount 모집 중인 공개 공고 수. 화면의 분류 버튼 숫자에 쓴다.
 * @param allCount 마감을 포함한 공개 공고 수
 */
public record PublicAuditionPostPageResult(
        List<PublicAuditionPostSummaryResult> posts,
        int page,
        int size,
        int totalPages,
        long totalElements,
        long openCount,
        long allCount
) {

    public PublicAuditionPostPageResult {
        posts = List.copyOf(posts);
    }
}
