package art.yesulin.infrastructure.admin.log;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.admin.log.LogLines;
import art.yesulin.application.admin.log.LogQuery;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileLogReaderTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-27T00:00:00Z"), ZoneOffset.UTC);

    private FileLogReader readerOf(Path path) {
        return new FileLogReader(new LogFileProperties(path.toString()), CLOCK);
    }

    private Path writeLines(Path directory, String name, int count) throws IOException {
        String content = IntStream.rangeClosed(1, count)
                .mapToObj(index -> "line-" + index)
                .collect(Collectors.joining("\n", "", "\n"));
        Path path = directory.resolve(name);
        Files.writeString(path, content, StandardCharsets.UTF_8);
        return path;
    }

    @Test
    void readsLastLinesInOrder(@TempDir Path directory) throws IOException {
        Path path = writeLines(directory, "app.log", 10);

        LogLines result = readerOf(path).readRecent(new LogQuery("", 3));

        assertTrue(result.available());
        assertEquals(List.of("line-8", "line-9", "line-10"), result.lines());
    }

    @Test
    void returnsEveryLineWhenFileIsSmallerThanLimit(@TempDir Path directory) throws IOException {
        Path path = writeLines(directory, "app.log", 4);

        LogLines result = readerOf(path).readRecent(new LogQuery("", 200));

        assertEquals(4, result.lines().size());
        assertFalse(result.truncated());
    }

    @Test
    void filtersIgnoringCase(@TempDir Path directory) throws IOException {
        Path path = directory.resolve("app.log");
        Files.writeString(path, "INFO started\nWARN Disk Full\ninfo stopped\n", StandardCharsets.UTF_8);

        LogLines result = readerOf(path).readRecent(new LogQuery("warn", 200));

        assertEquals(List.of("WARN Disk Full"), result.lines());
    }

    @Test
    void findsUppercaseKeywordWithLowercaseLine(@TempDir Path directory) throws IOException {
        Path path = directory.resolve("app.log");
        Files.writeString(path, "requestId=abc timeout\nok\n", StandardCharsets.UTF_8);

        LogLines result = readerOf(path).readRecent(new LogQuery("TIMEOUT", 200));

        assertEquals(1, result.lines().size());
    }

    @Test
    void marksTruncatedWhenReadWindowSkipsOlderLines(@TempDir Path directory) throws IOException {
        Path path = writeLines(directory, "app.log", 20000);

        LogLines result = readerOf(path).readRecent(new LogQuery("", 500));

        assertTrue(result.truncated());
        assertEquals(500, result.lines().size());
        assertEquals("line-20000", result.lines().getLast());
    }

    @Test
    void neverReturnsMoreThanMaxLimit(@TempDir Path directory) throws IOException {
        Path path = writeLines(directory, "app.log", 2000);

        LogLines result = readerOf(path).readRecent(new LogQuery("", 100000));

        assertEquals(LogQuery.MAX_LIMIT, result.lines().size());
    }

    /**
     * 읽기 창의 시작이 줄 경계와 정확히 맞는 경우다.
     * 첫 줄이 잘리지 않았는데도 버리면 그 줄의 검색어를 놓치므로, 경계 줄이 결과에 남아야 한다.
     */
    @Test
    void keepsWholeLineWhenWindowStartsExactlyAtLineBoundary(@TempDir Path directory) throws IOException {
        String marker = "BOUNDARY-MARKER";
        String markerLine = marker + "\n";
        int fillerLength = FileLogReader.MAX_READ_BYTES - markerLine.length() - 1;
        String tail = markerLine + "x".repeat(fillerLength) + "\n";
        Path path = directory.resolve("app.log");
        Files.writeString(path, "old\n" + tail, StandardCharsets.UTF_8);

        LogLines result = readerOf(path).readRecent(new LogQuery(marker, LogQuery.MAX_LIMIT));

        assertEquals(List.of(marker), result.lines());
    }

    /** 창이 줄 중간에서 시작하면 잘린 첫 줄은 버려야 한다. */
    @Test
    void dropsPartialFirstLineWhenWindowStartsInsideLine(@TempDir Path directory) throws IOException {
        String marker = "PARTIAL-MARKER";
        String tail = "x".repeat(FileLogReader.MAX_READ_BYTES - 1) + "\n";
        Path path = directory.resolve("app.log");
        Files.writeString(path, marker + tail, StandardCharsets.UTF_8);

        LogLines result = readerOf(path).readRecent(new LogQuery(marker, LogQuery.MAX_LIMIT));

        assertTrue(result.lines().isEmpty());
    }

    @Test
    void reportsUnavailableWhenFileIsMissing(@TempDir Path directory) {
        LogLines result = readerOf(directory.resolve("absent.log")).readRecent(new LogQuery("", 10));

        assertFalse(result.available());
        assertTrue(result.lines().isEmpty());
    }

    @Test
    void reportsUnavailableWhenPathIsNotConfigured() {
        FileLogReader reader = new FileLogReader(new LogFileProperties(" "), CLOCK);

        assertFalse(reader.readRecent(new LogQuery("", 10)).available());
    }
}
