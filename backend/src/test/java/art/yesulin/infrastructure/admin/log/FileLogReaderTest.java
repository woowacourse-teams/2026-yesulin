package art.yesulin.infrastructure.admin.log;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.admin.log.LogEntry;
import art.yesulin.application.admin.log.LogEntryFormat;
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
import tools.jackson.databind.ObjectMapper;

class FileLogReaderTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-27T00:00:00Z"), ZoneOffset.UTC);
    private static final LogLineParser LOG_LINE_PARSER = new LogLineParser(new ObjectMapper());

    private FileLogReader readerOf(Path path) {
        return new FileLogReader(new LogFileProperties(path.toString()), CLOCK, LOG_LINE_PARSER);
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
        assertEquals(LogEntryFormat.LEGACY, result.entries().getFirst().format());
        assertEquals("WARN", result.entries().getFirst().level());
    }

    @Test
    void parsesStructuredAndLegacyLinesTogether(@TempDir Path directory) throws IOException {
        String legacy = "2026-08-31 13:57:46.639 [http-nio-exec-8] INFO art.yesulin.Legacy "
                + "[requestId=legacy-request] HTTP status=200";
        String structured = """
                {"@timestamp":"2026-08-31T13:57:47.123+09:00","@version":"1","message":"Disk Full",\
                "logger_name":"art.yesulin.Structured","thread_name":"http-nio-exec-9","level":"WARN",\
                "level_value":30000,"requestId":"structured-request","event":"DISK_WARNING","elapsedMs":1200}
                """.replace("\n", "");
        Path path = directory.resolve("mixed.log");
        Files.writeString(path, legacy + "\n" + structured + "\n", StandardCharsets.UTF_8);

        LogLines result = readerOf(path).readRecent(new LogQuery("", 10));

        assertEquals(2, result.entries().size());
        LogEntry legacyEntry = result.entries().getFirst();
        assertEquals(LogEntryFormat.LEGACY, legacyEntry.format());
        assertEquals("legacy-request", legacyEntry.requestId());
        assertEquals("HTTP status=200", legacyEntry.message());
        assertEquals(Instant.parse("2026-08-31T04:57:46.639Z"), legacyEntry.timestamp());

        LogEntry structuredEntry = result.entries().getLast();
        assertEquals(LogEntryFormat.STRUCTURED, structuredEntry.format());
        assertEquals("structured-request", structuredEntry.requestId());
        assertEquals("Disk Full", structuredEntry.message());
        assertEquals("DISK_WARNING", structuredEntry.attributes().get("event"));
        assertEquals(1200, structuredEntry.attributes().get("elapsedMs"));
        assertEquals(Instant.parse("2026-08-31T04:57:47.123Z"), structuredEntry.timestamp());
    }

    @Test
    void treatsMalformedJsonAsLegacyWithoutFailingTheWholeQuery(@TempDir Path directory) throws IOException {
        Path path = directory.resolve("malformed.log");
        Files.writeString(path, "{not-json}\n", StandardCharsets.UTF_8);

        LogEntry entry = readerOf(path).readRecent(new LogQuery("", 10)).entries().getFirst();

        assertEquals(LogEntryFormat.LEGACY, entry.format());
        assertEquals("{not-json}", entry.raw());
        assertNull(entry.level());
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
        FileLogReader reader = new FileLogReader(new LogFileProperties(" "), CLOCK, LOG_LINE_PARSER);

        assertFalse(reader.readRecent(new LogQuery("", 10)).available());
    }
}
