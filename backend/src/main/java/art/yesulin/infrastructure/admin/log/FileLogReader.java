package art.yesulin.infrastructure.admin.log;

import art.yesulin.application.admin.log.LogLines;
import art.yesulin.application.admin.log.LogQuery;
import art.yesulin.application.admin.log.LogReader;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 로그 파일의 끝부분만 읽는다. 파일 전체를 메모리에 올리지 않도록 읽는 바이트 수에 상한을 둔다.
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

    private final LogFileProperties properties;
    private final Clock clock;

    @Override
    public LogLines readRecent(LogQuery query) {
        Instant readAt = Instant.now(clock);
        Path path = resolvePath();
        if (path == null || !Files.isReadable(path)) {
            return LogLines.unavailable(readAt);
        }

        try {
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

        return new LogLines(lastOf(matched, query.limit()), truncated, true, readAt);
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
        String keyword = query.keyword().toLowerCase(Locale.ROOT);
        return lines.stream()
                .filter(line -> line.toLowerCase(Locale.ROOT).contains(keyword))
                .toList();
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
