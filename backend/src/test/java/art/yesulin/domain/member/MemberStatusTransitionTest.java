package art.yesulin.domain.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

class MemberStatusTransitionTest {

    @Test
    void activatesPendingProducer() {
        Member member = new Member("producer@yesulin.art", "hash", MemberType.PRODUCER, MemberStatus.PENDING);

        member.activate();

        assertEquals(MemberStatus.ACTIVE, member.getStatus());
    }

    @Test
    void movesActiveProducerBackToPending() {
        Member member = Member.ofProducer("producer@yesulin.art", "hash");

        member.deactivate();

        assertEquals(MemberStatus.PENDING, member.getStatus());
    }

    @Test
    void rejectsStatusChangeOnAdmin() {
        Member admin = Member.ofAdmin("admin@yesulin.art", "hash");

        assertThrows(BusinessException.class, admin::deactivate);
    }

    @Test
    void createsAdminAsActive() {
        Member admin = Member.ofAdmin("admin@yesulin.art", "hash");

        assertEquals(MemberType.ADMIN, admin.getType());
        assertEquals(MemberStatus.ACTIVE, admin.getStatus());
    }
}
