package art.yesulin.presentation.api.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.HashSet;
import java.util.List;

public record BatchDeleteAdminFilesRequest(
        @NotEmpty @Size(max = 100) List<@NotNull @Positive Long> fileIds,
        @NotBlank @Size(max = 128) String confirmationPassword
) {

    public BatchDeleteAdminFilesRequest {
        if (fileIds != null && new HashSet<>(fileIds).size() != fileIds.size()) {
            throw new IllegalArgumentException("파일 ID는 중복될 수 없습니다.");
        }
    }

    @Override
    public String toString() {
        return "BatchDeleteAdminFilesRequest[fileIds=%s, confirmationPassword=[REDACTED]]".formatted(fileIds);
    }
}
