package art.yesulin.auditionpost.domain.alertchat;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/**
 * 공고 알림 오픈채팅방 인원의 변화. 공고마다 올린 시각의 인원으로 공개 조회수 추정치를 계산하므로 인원이 늘거나 줄어도 이미 올라온
 * 공고의 조회수는 그대로다. 처음 적기 전에 올라왔거나 올린 시각을 모르는 공고는 기록 전 인원으로 본다.
 */
public final class AlertChatMembers {

    /** 운영자가 인원을 적기 전에 화면 계산에 쓰던 인원. */
    public static final int INITIAL_MEMBER_COUNT = 109;

    private final List<AlertChatMemberCount> counts;

    private AlertChatMembers(List<AlertChatMemberCount> counts) {
        this.counts = counts.stream().sorted(Comparator.comparing(AlertChatMemberCount::getRecordedAt)).toList();
    }

    public static AlertChatMembers of(List<AlertChatMemberCount> counts) {
        return new AlertChatMembers(counts);
    }

    /** 공고를 올린 시각의 인원. 그 시각까지 마지막으로 적은 인원이다. */
    public int at(Instant postedAt) {
        if (postedAt == null) {
            return INITIAL_MEMBER_COUNT;
        }
        int members = INITIAL_MEMBER_COUNT;
        for (AlertChatMemberCount count : counts) {
            if (count.getRecordedAt().isAfter(postedAt)) {
                break;
            }
            members = count.getMemberCount();
        }
        return members;
    }

    /** 지금 올라오는 공고에 적용할 인원. */
    public int current() {
        return counts.isEmpty() ? INITIAL_MEMBER_COUNT : counts.getLast().getMemberCount();
    }
}
