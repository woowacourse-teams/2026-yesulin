package art.yesulin.actor.application.cheer;

import java.util.List;

/**
 * 배우 페이지의 응원 글 목록. 최신 글부터 담고, 더 있으면 다음 요청의 before로 쓸 nextBefore를 준다.
 *
 * @param totalCount 지우지 않은 응원 글 수
 * @param nextBefore 더 오래된 글이 없으면 null이다.
 */
public record ActorPageCheersResult(long totalCount, List<ActorPageCheerResult> cheers, Long nextBefore, Me me) {

    public ActorPageCheersResult {
        cheers = List.copyOf(cheers);
    }

    /**
     * 보는 사람이 이 페이지에 대해 가진 상태.
     *
     * @param loggedIn 세션이 있는 회원이다.
     * @param owner 이 배우 페이지의 주인이다.
     * @param canWrite 활성 일반 회원이고 주인이 아니라 응원 글을 쓸 수 있다.
     */
    public record Me(boolean loggedIn, boolean owner, boolean canWrite) {
    }
}
