package art.yesulin.application.file;

import art.yesulin.domain.file.FileReferenceKey;

public record FileReferenceCommand(String referenceType, long referenceId, String referenceSlot) {

    FileReferenceKey toKey() {
        return new FileReferenceKey(referenceType, referenceId, referenceSlot);
    }
}
