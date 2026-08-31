package art.yesulin.application.admin;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.infrastructure.auth.BcryptPasswordEncoder;
import at.favre.lib.crypto.bcrypt.BCrypt;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AdminDeletionRateLimitTest {

    private static final String PASSWORD = "fake-correct-password";
    private static final String HASH = BCrypt.withDefaults().hashToString(4, PASSWORD.toCharArray());
    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-08-31T00:00:00Z"));
    private final Clock clock = mock(Clock.class);
    private final BcryptPasswordEncoder encoder = spy(new BcryptPasswordEncoder());
    private AdminDeletionConfirmation confirmation;

    @BeforeEach
    void setUp() {
        when(clock.instant()).thenAnswer(invocation -> now.get());
        confirmation = new AdminDeletionConfirmation(encoder, HASH, clock);
    }

    @Test
    void unlocksExactlyTenMinutesAfterFifthFailureWithoutExtendingLock() {
        failAttempts(1L, 5);
        now.updateAndGet(time -> time.plus(Duration.ofMinutes(10)).minusMillis(1));
        BusinessException locked = assertThrows(BusinessException.class, () -> confirmation.verify(1L, PASSWORD));
        assertTrue(locked.getMessage().contains("1초"));

        now.updateAndGet(time -> time.plusMillis(1));

        assertDoesNotThrow(() -> confirmation.verify(1L, PASSWORD));
        verify(encoder, times(6)).matches(anyString(), anyString());
    }

    @Test
    void successBeforeLockClearsPreviousFailures() {
        failAttempts(1L, 4);
        confirmation.verify(1L, PASSWORD);
        failAttempts(1L, 4);

        assertDoesNotThrow(() -> confirmation.verify(1L, PASSWORD));
    }

    @Test
    void failuresOutsideRollingWindowDoNotCount() {
        failAttempts(1L, 4);
        now.updateAndGet(time -> time.plus(Duration.ofMinutes(10)));
        failAttempts(1L, 1);

        assertDoesNotThrow(() -> confirmation.verify(1L, PASSWORD));
    }

    @Test
    void failuresJustInsideRollingWindowStillLock() {
        failAttempts(1L, 4);
        now.updateAndGet(time -> time.plus(Duration.ofMinutes(10)).minusMillis(1));

        BusinessException locked = assertThrows(BusinessException.class, () -> confirmation.verify(1L, "wrong"));

        assertTrue(locked.getMessage().contains("600초"));
    }

    @Test
    void lockOfOneAccountDoesNotBlockAnother() {
        failAttempts(1L, 5);

        assertDoesNotThrow(() -> confirmation.verify(2L, PASSWORD));
    }

    @Test
    void lockedRequestsNeverComparePasswords() {
        failAttempts(1L, 5);

        assertThrows(BusinessException.class, () -> confirmation.verify(1L, PASSWORD));
        assertThrows(BusinessException.class, () -> confirmation.verify(1L, "wrong"));

        verify(encoder, times(5)).matches(anyString(), anyString());
    }

    @Test
    void newServerInstanceHasIndependentState() {
        failAttempts(1L, 5);
        AdminDeletionConfirmation restarted = new AdminDeletionConfirmation(encoder, HASH, clock);

        assertDoesNotThrow(() -> restarted.verify(1L, PASSWORD));
    }

    @Test
    void bcryptByteLimitViolationCountsAsFailureWithoutHashComparison() {
        String oversizedPassword = "가".repeat(25);
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThrows(BusinessException.class, () -> confirmation.verify(1L, oversizedPassword));
        }

        assertThrows(BusinessException.class, () -> confirmation.verify(1L, PASSWORD));
        verify(encoder, times(0)).matches(anyString(), anyString());
    }

    @Test
    void concurrentFailuresCannotExceedFivePasswordComparisons() throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(10)) {
            List<Future<Boolean>> results = new ArrayList<>();
            for (int attempt = 0; attempt < 20; attempt++) {
                results.add(executor.submit(() -> {
                    assertTrue(start.await(5, TimeUnit.SECONDS));
                    assertThrows(BusinessException.class, () -> confirmation.verify(1L, "wrong"));
                    return true;
                }));
            }

            start.countDown();

            for (Future<Boolean> result : results) {
                assertEquals(true, result.get(10, TimeUnit.SECONDS));
            }
        }
        verify(encoder, times(5)).matches(anyString(), anyString());
        assertThrows(BusinessException.class, () -> confirmation.verify(1L, PASSWORD));
    }

    private void failAttempts(long actorMemberId, int count) {
        for (int attempt = 0; attempt < count; attempt++) {
            assertThrows(BusinessException.class, () -> confirmation.verify(actorMemberId, "wrong"));
        }
    }
}
