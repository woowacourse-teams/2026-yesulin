package art.yesulin.feedback.application;

/** 화면이 올린 이미지 한 장. 형식은 브라우저가 알린 값이라 저장 전에 파일 앞부분으로 다시 확인한다. */
public record FeedbackImageFile(String reportedType, byte[] content) {

    public FeedbackImageFile {
        content = content.clone();
    }

    @Override
    public byte[] content() {
        return content.clone();
    }

    public long size() {
        return content.length;
    }
}
