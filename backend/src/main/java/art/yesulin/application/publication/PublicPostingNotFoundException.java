package art.yesulin.application.publication;

public final class PublicPostingNotFoundException extends RuntimeException {

    public PublicPostingNotFoundException(long postingId) {
        super("공개 공고를 찾을 수 없습니다. id=" + postingId);
    }
}
