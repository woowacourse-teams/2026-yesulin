package art.yesulin.application.draft;

public interface DraftAttachmentService {

    void attachVerifiedDraft(long draftId, long authenticatedAccountId);
}
