package art.yesulin.actor.domain.page;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ActorPageHandleTest {

    @ParameterizedTest
    @ValueSource(strings = {"a", "123", "_", "minzzun.__", "yesulin.kim", "admin_", "abcdefghijklmnopqrstuvwxyz1234"})
    void acceptsValidHandlesAndOnlyBlocksExactReservedWords(String value) {
        assertEquals(value, new ActorPageHandle(value).value());
    }

    @ParameterizedTest
    @ValueSource(strings = {"  MiNzZuN.__  ", "MINZZUN.__"})
    void normalizesCaseAndSurroundingWhitespace(String value) {
        assertEquals("minzzun.__", new ActorPageHandle(value).value());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", ".a", "a.", "a..b", "a-b", "a b", "한글", "abcdefghijklmnopqrstuvwxyz12345"})
    void rejectsInvalidFormat(String value) {
        BusinessException exception = assertThrows(BusinessException.class, () -> new ActorPageHandle(value));
        assertEquals(ActorPageErrorCode.ACTOR_HANDLE_INVALID, exception.getErrorCode());
    }

    @ParameterizedTest
    @ValueSource(strings = {"admin", "administrator", "yesulin", "official", "support", "help", "api", "www",
            "me", "root", "system", "null", "undefined"})
    void rejectsEveryReservedHandle(String value) {
        BusinessException exception = assertThrows(BusinessException.class, () -> new ActorPageHandle(value));
        assertEquals(ActorPageErrorCode.ACTOR_HANDLE_RESERVED, exception.getErrorCode());
    }
}
