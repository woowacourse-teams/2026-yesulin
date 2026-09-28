package art.yesulin.application.admin;

import static art.yesulin.domain.admin.AdminErrorCode.DELETION_CONFIRMATION_FAILED;

import art.yesulin.common.exception.BusinessException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AdminFileDeletionConfirmation {

    private final byte[] configuredPassword;

    public AdminFileDeletionConfirmation(
            @Value("${yesulin.admin.file-deletion-password:}") String password
    ) {
        this.configuredPassword = password.getBytes(StandardCharsets.UTF_8);
    }

    public void verify(String password) {
        if (configuredPassword.length == 0 || password == null || password.isBlank()
                || !MessageDigest.isEqual(configuredPassword, password.getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessException(DELETION_CONFIRMATION_FAILED, "파일 삭제 확인 비밀번호가 올바르지 않습니다.");
        }
    }
}
