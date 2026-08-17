package art.yesulin.domain.file;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

public record FileReferenceKey(String referenceType, long referenceId, String referenceSlot) {

    public FileReferenceKey {
        referenceType = requireText(referenceType, "파일 참조 타입은 필수입니다.");
        referenceId = requirePositive(referenceId, "파일 참조 ID는 1 이상이어야 합니다.");
        referenceSlot = requireText(referenceSlot, "파일 참조 위치는 필수입니다.");
    }
}
