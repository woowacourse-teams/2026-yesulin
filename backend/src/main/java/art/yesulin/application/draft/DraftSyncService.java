package art.yesulin.application.draft;

public interface DraftSyncService {

    DraftResult find(long accountId, long postingId);

    DraftResult synchronize(long accountId, DraftSyncCommand command);
}
