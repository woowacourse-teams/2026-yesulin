package art.yesulin.actor.application.cheer;

import java.time.Instant;

/**
 * 응원 글 하나. 작성 회원은 담지 않고 그 페이지의 팬 번호와 내 글인지만 알린다.
 *
 * @param fanNumber 그 배우 페이지에서 처음 응원한 순서대로 매긴 번호(1호 팬이면 1)
 * @param mine 내가 쓴 글이다.
 * @param edited 쓴 뒤에 고쳤다.
 */
public record ActorPageCheerResult(
        long id, int fanNumber, String body, boolean mine, Instant createdAt, boolean edited
) {
}
