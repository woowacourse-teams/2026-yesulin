package art.yesulin.auditionpost.application;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

/**
 * 연 파일의 형식·크기·내용 스트림.
 *
 * @param contentType 원문 서버가 알려 준 형식. 모르면 빈 문자열이다.
 */
public record SourceFileContent(String contentType, long size, InputStream content) implements AutoCloseable {

    @Override
    public void close() {
        try {
            content.close();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
