package art.yesulin.actor.domain.cheer;

import java.util.List;

/**
 * 한 배우 페이지에서 회원이 처음 응원한 순서대로 매기는 팬 번호. 삭제한 글도 순서에 포함하고 같은 회원은 같은 번호를 쓴다.
 */
public final class ActorFanNumbers {

    private final List<Long> membersInFirstCheerOrder;

    public ActorFanNumbers(List<Long> membersInFirstCheerOrder) {
        this.membersInFirstCheerOrder = List.copyOf(membersInFirstCheerOrder);
    }

    public int numberOf(long memberId) {
        int index = membersInFirstCheerOrder.indexOf(memberId);
        if (index < 0) {
            throw new IllegalStateException("응원 기록이 없는 회원의 팬 번호를 만들 수 없습니다.");
        }
        return index + 1;
    }
}
