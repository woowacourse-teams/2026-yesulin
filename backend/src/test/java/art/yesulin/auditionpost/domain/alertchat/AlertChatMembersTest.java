package art.yesulin.auditionpost.domain.alertchat;

import static art.yesulin.auditionpost.domain.alertchat.AlertChatMembers.INITIAL_MEMBER_COUNT;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class AlertChatMembersTest {

    private static final long ADMIN_ID = 1L;
    private static final Instant FIRST = Instant.parse("2026-10-21T06:00:00Z");
    private static final Instant SECOND = Instant.parse("2026-10-25T06:00:00Z");

    @Test
    void usesInitialCountBeforeAnyRecord() {
        AlertChatMembers members = AlertChatMembers.of(List.of());

        assertEquals(INITIAL_MEMBER_COUNT, members.at(FIRST));
        assertEquals(INITIAL_MEMBER_COUNT, members.current());
    }

    @Test
    void usesCountRecordedLastBeforePosting() {
        AlertChatMembers members = AlertChatMembers.of(List.of(
                new AlertChatMemberCount(220, ADMIN_ID, SECOND),
                new AlertChatMemberCount(181, ADMIN_ID, FIRST)
        ));

        assertEquals(INITIAL_MEMBER_COUNT, members.at(FIRST.minusSeconds(1)));
        assertEquals(181, members.at(FIRST));
        assertEquals(181, members.at(SECOND.minusSeconds(1)));
        assertEquals(220, members.at(SECOND.plusSeconds(60 * 60 * 24)));
        assertEquals(220, members.current());
    }

    @Test
    void usesInitialCountWhenPostingTimeIsUnknown() {
        AlertChatMembers members = AlertChatMembers.of(List.of(new AlertChatMemberCount(181, ADMIN_ID, FIRST)));

        assertEquals(INITIAL_MEMBER_COUNT, members.at(null));
    }

    @Test
    void rejectsCountOutOfRange() {
        assertThrows(BusinessException.class, () -> new AlertChatMemberCount(0, ADMIN_ID, FIRST));
        assertThrows(BusinessException.class, () -> new AlertChatMemberCount(
                AlertChatMemberCount.MAX_MEMBER_COUNT + 1, ADMIN_ID, FIRST
        ));
        assertThrows(BusinessException.class, () -> new AlertChatMemberCount(181, 0L, FIRST));
    }
}
