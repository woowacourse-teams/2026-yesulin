package art.yesulin.application.submission;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
class SubmissionRequestFingerprint {

    private final ObjectMapper objectMapper;

    String create(UUID auditionId, SubmitSubmissionCommand command) {
        try {
            byte[] request = objectMapper.writeValueAsBytes(new FingerprintTarget(auditionId, command));
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(request));
        } catch (JacksonException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("지원서 요청 hash를 생성할 수 없습니다.", exception);
        }
    }

    private record FingerprintTarget(
            UUID auditionId,
            SubmitSubmissionCommand command
    ) {
    }
}
