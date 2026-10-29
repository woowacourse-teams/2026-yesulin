package art.yesulin.auth.domain.memberlink;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class MemberLinkCodeTest {

    private static final Instant NOW = Instant.parse("2026-10-28T09:00:00Z");

    @Test
    void acceptsReadableFormattingAndConsumesExactlyOnce() {
        String hash = MemberLinkCode.hash("ABCD-EFGH");
        MemberLinkCode code = new MemberLinkCode(1L, hash, NOW);
        assertEquals(hash, MemberLinkCode.hash("abcd efgh"));
        assertNotEquals("ABCDEFGH", hash);
        code.consume(hash, NOW.plusSeconds(599));
        assertThrows(BusinessException.class, () -> code.consume(hash, NOW.plusSeconds(599)));
    }

    @Test
    void expiryBoundaryAndReissueInvalidatePreviousCode() {
        String first = MemberLinkCode.hash("ABCDEFGH");
        MemberLinkCode code = new MemberLinkCode(1L, first, NOW);
        assertThrows(BusinessException.class, () -> code.consume(first, NOW.plusSeconds(600)));
        assertThrows(BusinessException.class, () -> code.reissue(MemberLinkCode.hash("BCDEFGHJ"), NOW.plusSeconds(29)));
        String second = MemberLinkCode.hash("BCDEFGHJ");
        code.reissue(second, NOW.plusSeconds(30));
        assertThrows(BusinessException.class, () -> code.consume(first, NOW.plusSeconds(31)));
        code.consume(second, NOW.plusSeconds(31));
    }
}
