package art.yesulin.application.admin;

import java.util.List;

public record BatchFileDeletionResult(List<Item> results) {

    public record Item(long fileId, Status status, String code) {
    }

    public enum Status {
        DELETED, ALREADY_DELETED, FAILED
    }
}
