package art.yesulin.operation.infrastructure.log;

import art.yesulin.operation.application.log.LogLines;
import art.yesulin.operation.application.log.LogQuery;
import art.yesulin.operation.application.log.LogReader;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.ByteBuffer;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.NavigableMap;
import java.util.TreeMap;
import java.util.zip.GZIPInputStream;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 로그 파일의 끝부분만 읽는다. 파일 전체를 메모리에 올리지 않도록 읽는 바이트 수에 상한을 둔다.
 * 지난 날짜는 logback이 `{로그 파일}.{yyyy-MM-dd}.{번호}.gz`로 압축 보관한 파일을 한 줄씩 풀어 읽는다.
 * 이 이름 규칙은 application.yml의 `logging.logback.rollingpolicy.file-name-pattern`과 같아야 한다.
 */
@Component
@RequiredArgsConstructor
@EnableConfigurationProperties(LogFileProperties.class)
public class FileLogReader implements LogReader {

    private static final Logger LOGGER = LoggerFactory.getLogger(FileLogReader.class);

    /** 한 번에 읽는 최대 바이트다. 검색이 필요할 때만 이 상한까지 읽는다. 경계 테스트가 참조한다. */
    static final int MAX_READ_BYTES = 512 * 1024;
    /** 검색어가 없을 때 필요한 창 크기를 어림하는 데 쓰는 한 줄 평균 바이트다. */
    private static final int ESTIMATED_LINE_BYTES = 400;
    private static final int WINDOW_MARGIN_BYTES = 8 * 1024;
    private static final byte LINE_FEED = (byte) '\n';
    /** 하루치 보관 로그에서 풀어 읽는 최대 문자 수다. 최신 보관 파일부터 읽고 넘치면 더 오래된 파일은 건너뛴다. */
    static final long MAX_ARCHIVE_SCAN_CHARS = 64L * 1024 * 1024;
    /** 하루에 읽는 보관 파일 수의 상한이다. 넘으면 최신 파일만 남긴다. */
    private static final int MAX_ARCHIVE_PARTS = 200;
    private static final String ARCHIVE_SUFFIX = ".gz";

    private final LogFileProperties properties;
    private final Clock clock;
    private final LogLineParser logLineParser;

    @Override
    public LogLines readRecent(LogQuery query) {
        Instant readAt = Instant.now(clock);
        Path path = resolvePath();
        if (path == null || !Files.isReadable(path)) {
            return LogLines.unavailable(readAt);
        }

        try {
            if (isArchivedDate(query.date())) {
                return readArchived(path, query, readAt);
            }
            return read(path, query, readAt);
        } catch (IOException exception) {
            LOGGER.warn("로그 파일을 읽지 못했다. reason={}", exception.getClass().getSimpleName());
            return LogLines.unavailable(readAt);
        }
    }

    private LogLines read(Path path, LogQuery query, Instant readAt) throws IOException {
        long size = Files.size(path);
        int window = windowSizeOf(query);
        long windowStart = Math.max(0L, size - window);
        boolean skippedOlderBytes = windowStart > 0L;

        // 창이 줄 중간에서 시작했는지 알아야 온전한 줄을 잘못 버리지 않는다. 바로 앞 1바이트를 함께 읽어 확인한다.
        long readStart = skippedOlderBytes ? windowStart - 1 : 0L;
        byte[] bytes = readFrom(path, readStart, (int) Math.min(size - readStart, (long) window + 1));
        int offset = skippedOlderBytes && bytes.length > 0 ? 1 : 0;
        boolean startsMidLine = offset == 1 && bytes[0] != LINE_FEED;

        String content = new String(bytes, offset, bytes.length - offset, StandardCharsets.UTF_8);
        List<String> matched = filter(toLines(content, startsMidLine), query);
        boolean truncated = skippedOlderBytes || matched.size() > query.limit();

        List<String> selected = lastOf(matched, query.limit());
        return new LogLines(
                selected,
                selected.stream().map(logLineParser::parse).toList(),
                truncated,
                true,
                readAt
        );
    }

    /** logback은 JVM 기본 시간대의 날짜로 파일을 나눈다. 오늘은 아직 보관되지 않았으므로 현재 파일을 읽는다. */
    private boolean isArchivedDate(LocalDate date) {
        return date != null && date.isBefore(LocalDate.ofInstant(Instant.now(clock), ZoneId.systemDefault()));
    }

    private LogLines readArchived(Path current, LogQuery query, Instant readAt) throws IOException {
        ArchiveParts archive = archiveParts(current, query.date());
        List<Path> parts = archive.paths();
        if (parts.isEmpty()) {
            return LogLines.empty(readAt);
        }

        Deque<String> collected = new ArrayDeque<>();
        boolean truncated = archive.skippedOlder();
        long scanned = 0L;
        for (int index = parts.size() - 1; index >= 0; index--) {
            if (scanned >= MAX_ARCHIVE_SCAN_CHARS || collected.size() >= query.limit()) {
                truncated = true;
                break;
            }
            ArchivePart part = readArchivePart(parts.get(index), query);
            scanned += part.scannedChars();
            truncated |= part.truncated();
            part.lines().descendingIterator().forEachRemaining(collected::addFirst);
        }
        while (collected.size() > query.limit()) {
            collected.removeFirst();
            truncated = true;
        }

        List<String> selected = List.copyOf(collected);
        return new LogLines(selected, selected.stream().map(logLineParser::parse).toList(), truncated, true, readAt);
    }

    /**
     * 그 날짜의 보관 파일을 번호 순(오래된 순)으로 찾고 최신 {@link #MAX_ARCHIVE_PARTS}개만 남긴다.
     * 보관 용량 상한에 걸리면 logback이 앞 번호부터 지우므로 0번이 없어도 남은 파일을 읽는다.
     */
    private ArchiveParts archiveParts(Path current, LocalDate date) throws IOException {
        Path directory = current.toAbsolutePath().getParent();
        String prefix = current.getFileName() + "." + date + ".";
        NavigableMap<Integer, Path> indexed = new TreeMap<>();
        try (DirectoryStream<Path> entries = Files.newDirectoryStream(directory)) {
            for (Path entry : entries) {
                Integer index = archiveIndexOf(entry.getFileName().toString(), prefix);
                if (index != null && Files.isReadable(entry)) {
                    indexed.put(index, entry);
                }
            }
        }
        if (indexed.isEmpty()) {
            return new ArchiveParts(List.of(), false);
        }

        List<Path> parts = new ArrayList<>(indexed.values());
        int first = Math.max(0, parts.size() - MAX_ARCHIVE_PARTS);
        boolean skippedOlder = first > 0 || indexed.firstKey() > 0;
        return new ArchiveParts(List.copyOf(parts.subList(first, parts.size())), skippedOlder);
    }

    /** `{prefix}{번호}.gz` 형식이면 번호를, 아니면 null을 돌려준다. */
    private Integer archiveIndexOf(String fileName, String prefix) {
        if (!fileName.startsWith(prefix) || !fileName.endsWith(ARCHIVE_SUFFIX)) {
            return null;
        }
        String index = fileName.substring(prefix.length(), fileName.length() - ARCHIVE_SUFFIX.length());
        if (index.isEmpty() || index.length() > 9 || !index.chars().allMatch(c -> c >= '0' && c <= '9')) {
            return null;
        }
        return Integer.parseInt(index);
    }

    /** 오래된 순 보관 파일과, 지워졌거나 상한을 넘어 읽지 않은 더 오래된 파일이 있는지 여부다. */
    private record ArchiveParts(List<Path> paths, boolean skippedOlder) {
    }

    /** 압축 파일 하나를 풀면서 조건에 맞는 마지막 줄만 남긴다. 파일 전체를 메모리에 올리지 않는다. */
    private ArchivePart readArchivePart(Path part, LogQuery query) throws IOException {
        Deque<String> lines = new ArrayDeque<>(query.limit());
        boolean truncated = false;
        long scanned = 0L;
        // gzip 헤더가 깨져 GZIPInputStream 생성이 실패해도 파일 스트림은 닫히도록 따로 선언한다.
        try (InputStream file = Files.newInputStream(part);
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(new GZIPInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                scanned += line.length() + 1L;
                String trimmed = line.stripTrailing();
                if (!query.matches(trimmed)) {
                    continue;
                }
                if (lines.size() == query.limit()) {
                    lines.removeFirst();
                    truncated = true;
                }
                lines.addLast(trimmed);
            }
        }
        return new ArchivePart(lines, truncated, scanned);
    }

    private record ArchivePart(Deque<String> lines, boolean truncated, long scannedChars) {
    }

    private int windowSizeOf(LogQuery query) {
        if (query.hasKeyword()) {
            return MAX_READ_BYTES;
        }
        long estimated = (long) query.limit() * ESTIMATED_LINE_BYTES + WINDOW_MARGIN_BYTES;
        return (int) Math.min(MAX_READ_BYTES, estimated);
    }

    private byte[] readFrom(Path path, long start, int length) throws IOException {
        ByteBuffer buffer = ByteBuffer.allocate(length);
        try (SeekableByteChannel channel = Files.newByteChannel(path, StandardOpenOption.READ)) {
            channel.position(start);
            while (buffer.hasRemaining() && channel.read(buffer) > 0) {
                // 채널이 한 번에 다 주지 않을 수 있어 버퍼가 찰 때까지 반복한다.
            }
        }
        return java.util.Arrays.copyOf(buffer.array(), buffer.position());
    }

    /** 창이 줄 중간에서 시작했다면 첫 줄이 잘려 있으므로 버린다. */
    private List<String> toLines(String content, boolean startsMidLine) {
        List<String> lines = new ArrayList<>(List.of(content.split("\n", -1)));
        if (!lines.isEmpty() && lines.getLast().isEmpty()) {
            lines.removeLast();
        }
        if (startsMidLine && !lines.isEmpty()) {
            lines.removeFirst();
        }
        return lines.stream().map(line -> line.stripTrailing()).toList();
    }

    private List<String> filter(List<String> lines, LogQuery query) {
        if (!query.hasKeyword()) {
            return lines;
        }
        return lines.stream().filter(query::matches).toList();
    }

    private List<String> lastOf(List<String> lines, int limit) {
        if (lines.size() <= limit) {
            return lines;
        }
        return List.copyOf(lines.subList(lines.size() - limit, lines.size()));
    }

    private Path resolvePath() {
        String configured = properties.name();
        if (configured == null || configured.isBlank()) {
            return null;
        }
        return Path.of(configured);
    }
}
