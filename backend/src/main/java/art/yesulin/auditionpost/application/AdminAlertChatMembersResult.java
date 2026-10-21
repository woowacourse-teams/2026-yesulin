package art.yesulin.auditionpost.application;

import java.time.Instant;
import java.util.List;

/**
 * 운영자가 보는 공고 알림 오픈채팅방 인원.
 *
 * @param currentMemberCount 지금 올라오는 공고에 적용하는 인원. 아직 적지 않았으면 기록 전 인원이다.
 * @param initialMemberCount 처음 적기 전에 올라왔거나 올린 시각을 모르는 공고에 적용하는 인원
 * @param history 적은 기록. 최근 것부터다.
 */
public record AdminAlertChatMembersResult(int currentMemberCount, int initialMemberCount, List<Entry> history) {

    public AdminAlertChatMembersResult {
        history = List.copyOf(history);
    }

    public record Entry(long id, int memberCount, Instant recordedAt) {
    }
}
