package art.yesulin.actor.application.cheer;

/**
 * 배우 페이지의 좋아요 수와 보는 사람의 상태. 연락처나 누른 사람은 담지 않는다.
 *
 * @param viewer 로그인하지 않았으면 모두 false다.
 */
public record ActorPageLikesResult(long count, Viewer viewer) {

    /**
     * 보는 사람이 이 배우 페이지에 대해 가진 상태.
     *
     * @param loggedIn 세션이 있는 회원이다.
     * @param owner 이 배우 페이지의 주인이다.
     * @param canLike 활성 배우 계정이고 페이지 주인이 아니라 좋아요를 누를 수 있다.
     * @param liked 이미 눌렀다.
     */
    public record Viewer(boolean loggedIn, boolean owner, boolean canLike, boolean liked) {

        public static Viewer anonymous() {
            return new Viewer(false, false, false, false);
        }
    }
}
