package art.yesulin.application.auditionpost;

/** 원문에 있는 파일 하나. {@code url}은 출처 adapter만 해석하며 화면에 그대로 내보내지 않는다. */
public record SourceFile(String filename, String url) {
}
