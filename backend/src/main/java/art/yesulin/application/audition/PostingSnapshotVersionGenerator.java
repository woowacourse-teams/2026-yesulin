package art.yesulin.application.audition;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** 지원자가 본 제3자 제공 대상과 제출 시점의 대상을 비교하기 위한 불투명 버전을 만든다. */
@Component
public class PostingSnapshotVersionGenerator {

    private static final String FORMAT_VERSION = "v1";

    public String generate(UUID auditionId, String companyName) {
        UUID validAuditionId = requireNonNull(auditionId, "공고 공개 ID는 필수입니다.");
        String validCompanyName = requireText(companyName, "기획사·제작사명은 필수입니다.");
        String snapshot = String.join("\n", FORMAT_VERSION, validAuditionId.toString(), validCompanyName);
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(snapshot.getBytes(StandardCharsets.UTF_8));
            return FORMAT_VERSION + "." + HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("공고 스냅샷 버전을 생성할 수 없습니다.", exception);
        }
    }
}
