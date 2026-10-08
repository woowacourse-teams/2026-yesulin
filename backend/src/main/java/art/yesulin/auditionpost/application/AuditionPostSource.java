package art.yesulin.auditionpost.application;

/**
 * 외부 공고 사이트에서 공고 한 건과 그 파일을 읽는 port. 원문 접속·HTML 구조 오류는
 * {@link AuditionPostSourceException}으로 알린다.
 */
public interface AuditionPostSource {

    String getSource();

    /** 원문 번호의 공고를 읽는다. 본문 사진 자리는 {@link AuditionPostBody#placeholder(int)}로 바꿔 둔다. */
    SourcePost fetch(String externalId);

    /**
     * 파일을 스트림으로 연다. 호출자가 반드시 닫는다.
     *
     * @param maxBytes 이 크기를 넘으면 내용을 읽기 전에 {@link SourceFileTooLargeException}을 던진다.
     */
    SourceFileContent open(SourceFile file, long maxBytes);
}
