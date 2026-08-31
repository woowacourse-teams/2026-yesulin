package art.yesulin.application.admin;

import static art.yesulin.domain.admin.AdminErrorCode.DELETION_CONFIRMATION_FAILED;

import art.yesulin.application.auth.PasswordEncoder;
import art.yesulin.common.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AdminDeletionConfirmation {

    private static final String FAILURE_MESSAGE = "삭제 확인 비밀번호가 올바르지 않습니다.";

    private final PasswordEncoder passwordEncoder;
    private final String encodedPassword;

    public AdminDeletionConfirmation(
            PasswordEncoder passwordEncoder,
            @Value("${yesulin.admin.deletion-password-hash:}") String encodedPassword
    ) {
        this.passwordEncoder = passwordEncoder;
        this.encodedPassword = encodedPassword;
    }

    public void verify(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank() || encodedPassword.isBlank()) {
            throw failed();
        }
        try {
            if (!passwordEncoder.matches(rawPassword, encodedPassword)) {
                throw failed();
            }
        } catch (IllegalArgumentException exception) {
            throw failed();
        }
    }

    private BusinessException failed() {
        return new BusinessException(DELETION_CONFIRMATION_FAILED, FAILURE_MESSAGE);
    }
}
