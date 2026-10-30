package art.yesulin.pdfextraction.application.ai;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PdfAiDispatcherTest {

    private final PdfAiWorker worker = mock(PdfAiWorker.class);
    private final ExecutorService executor = mock(ExecutorService.class);
    private final Deque<Runnable> tasks = new ArrayDeque<>();
    private final ScheduledExecutorService wakeups = mock(ScheduledExecutorService.class);
    private final Deque<Runnable> delayedSignals = new ArrayDeque<>();
    private final AtomicLong nanoTime = new AtomicLong();

    @BeforeEach
    void prepareExecutor() {
        acceptTasks();
        acceptDelayedSignals();
    }

    @Test
    void callbackSignalsStayAsynchronousAndDoNotQueueMoreThanConfiguredWorkers() {
        PdfAiDispatcher dispatcher = dispatcher(2);
        for (int index = 0; index < 300; index++) {
            dispatcher.wakeUp();
        }

        verifyNoInteractions(worker);
        assertEquals(2, tasks.size());
        tasks.removeFirst().run();
        tasks.removeFirst().run();
        assertEquals(0, tasks.size());
        verify(worker, times(2)).tick();
    }

    @Test
    void admittedWorkDrainsWithoutWaitingForAnotherSchedulerTick() {
        PdfAiDispatcher dispatcher = dispatcher(1);
        when(worker.tick()).thenReturn(true, true, false);

        dispatcher.wakeUp();
        tasks.removeFirst().run();

        verify(worker, times(3)).tick();
        assertEquals(0, tasks.size());
    }

    @Test
    void signalArrivingDuringAnEmptyClaimIsObservedBeforeWorkerStops() {
        PdfAiDispatcher dispatcher = dispatcher(1);
        when(worker.tick()).thenAnswer(invocation -> {
            dispatcher.wakeUp();
            return false;
        }).thenReturn(false);

        dispatcher.wakeUp();
        tasks.removeFirst().run();

        verify(worker, times(2)).tick();
        assertEquals(0, tasks.size());
    }

    @Test
    void schedulerCanWakeWorkerAgainAfterAnUnexpectedClaimFailure() {
        PdfAiDispatcher dispatcher = dispatcher(1);
        when(worker.tick()).thenThrow(new IllegalStateException("unavailable")).thenReturn(false);

        dispatcher.wakeUp();
        assertDoesNotThrow(() -> tasks.removeFirst().run());
        dispatcher.wakeUp();
        tasks.removeFirst().run();

        verify(worker, times(2)).tick();
    }

    @Test
    void rejectedSignalDoesNotFailCommittedCallbackOrLeakCapacity() {
        PdfAiDispatcher dispatcher = dispatcher(1);
        doThrow(new RejectedExecutionException()).when(executor).execute(any(Runnable.class));

        assertDoesNotThrow(dispatcher::wakeUp);
        acceptTasks();
        dispatcher.wakeUp();
        tasks.removeFirst().run();

        verify(worker).tick();
    }

    @Test
    void closePreventsQueuedAndFutureSignalsFromClaimingWork() {
        PdfAiDispatcher dispatcher = dispatcher(1);
        dispatcher.wakeUp();

        dispatcher.close();
        tasks.removeFirst().run();
        dispatcher.wakeUp();

        verifyNoInteractions(worker);
        verify(executor).close();
        verify(wakeups).shutdownNow();
        assertEquals(0, tasks.size());
    }

    @Test
    void successfulClaimSchedulesOneMergedAdmissionSignalAndEmptyQueueStopsIt() {
        PdfAiDispatcher dispatcher = dispatcher(2, Duration.ofMillis(200));
        dispatcher.wakeUpAfterInterval();
        dispatcher.wakeUpAfterInterval();
        assertEquals(1, delayedSignals.size());
        verifyNoInteractions(worker);
        nanoTime.set(Duration.ofMillis(200).toNanos());

        delayedSignals.removeFirst().run();
        tasks.removeFirst().run();

        verify(worker).tick();
        assertEquals(0, delayedSignals.size());
        assertEquals(0, tasks.size());
    }

    @Test
    void newerClaimMovesAdmissionToTheLatestRequestInterval() {
        PdfAiDispatcher dispatcher = dispatcher(1, Duration.ofMillis(200));
        dispatcher.wakeUpAfterInterval();
        nanoTime.set(Duration.ofMillis(100).toNanos());
        dispatcher.wakeUpAfterInterval();
        nanoTime.set(Duration.ofMillis(200).toNanos());

        delayedSignals.removeFirst().run();
        assertEquals(0, tasks.size());
        assertEquals(1, delayedSignals.size());
        nanoTime.set(Duration.ofMillis(300).toNanos());
        delayedSignals.removeFirst().run();
        tasks.removeFirst().run();

        verify(worker).tick();
        assertEquals(0, delayedSignals.size());
    }

    @Test
    void rejectedDelayedSignalCanBeScheduledAgainWithoutFailingTheClaim() {
        PdfAiDispatcher dispatcher = dispatcher(1);
        doThrow(new RejectedExecutionException()).when(wakeups)
                .schedule(any(Runnable.class), anyLong(), eq(TimeUnit.NANOSECONDS));

        assertDoesNotThrow(dispatcher::wakeUpAfterInterval);
        acceptDelayedSignals();
        dispatcher.wakeUpAfterInterval();
        delayedSignals.removeFirst().run();
        tasks.removeFirst().run();

        verify(worker).tick();
    }

    @Test
    void highConcurrencyStartsOneAdmissionPerSignalWhenRequestIntervalIsEnabled() {
        PdfAiDispatcher dispatcher = dispatcher(50, Duration.ofMillis(200));

        dispatcher.wakeUp();

        assertEquals(1, tasks.size());
        tasks.removeFirst().run();
        verify(worker).tick();
    }

    private PdfAiDispatcher dispatcher(int concurrency) {
        return dispatcher(concurrency, Duration.ZERO);
    }

    private PdfAiDispatcher dispatcher(int concurrency, Duration interval) {
        PdfAiProperties properties = new PdfAiProperties(true, "bedrock", "test-model", "ap-northeast-2",
                concurrency, 3, Duration.ofMinutes(2), interval);
        return new PdfAiDispatcher(worker, properties, executor, wakeups, nanoTime::get);
    }

    private void acceptTasks() {
        doAnswer(invocation -> {
            tasks.addLast(invocation.getArgument(0));
            return null;
        }).when(executor).execute(any(Runnable.class));
    }

    private void acceptDelayedSignals() {
        doAnswer(invocation -> {
            delayedSignals.addLast(invocation.getArgument(0));
            return null;
        }).when(wakeups).schedule(any(Runnable.class), anyLong(), eq(TimeUnit.NANOSECONDS));
    }
}
