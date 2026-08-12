package art.yesulin.application.draft;

public final class DraftNotFoundException extends RuntimeException {

    public DraftNotFoundException(long draftId) {
        super("Draft를 찾을 수 없습니다. id=" + draftId);
    }
}
