package art.yesulin.application.auditionpost;

/** 원문 파일이 허용 크기를 넘는다. 내용을 내려받기 전에 판단한다. */
public class SourceFileTooLargeException extends AuditionPostSourceException {

    public SourceFileTooLargeException(String message) {
        super(message);
    }
}
