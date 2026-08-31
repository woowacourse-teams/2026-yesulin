package art.yesulin.infrastructure.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.infrastructure.auth.BcryptPasswordEncoder;
import java.io.BufferedReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;
import org.junit.jupiter.api.Test;

class AdminDeletionPasswordHashGeneratorTest {

    @Test
    void generateReturnsMatchingBcryptHashWhenPasswordsMatch() {
        String password = "private-delete-pattern";

        String encoded = AdminDeletionPasswordHashGenerator.generate(
                password.toCharArray(), password.toCharArray()
        );

        assertTrue(new BcryptPasswordEncoder().matches(password, encoded));
    }

    @Test
    void generateThrowsIllegalArgumentExceptionWhenPasswordsDoNotMatch() {
        assertThrows(IllegalArgumentException.class, () -> AdminDeletionPasswordHashGenerator.generate(
                "private-delete-pattern".toCharArray(), "different-pattern".toCharArray()
        ));
    }

    @Test
    void generateFromStdinPrintsMatchingHashWhenPasswordsMatch() {
        String password = "private-delete-pattern";
        StringWriter output = new StringWriter();

        AdminDeletionPasswordHashGenerator.generateFromStdin(
                new BufferedReader(new StringReader(password + System.lineSeparator() + password)),
                new PrintWriter(output, true)
        );

        assertTrue(new BcryptPasswordEncoder().matches(password, output.toString().trim()));
    }

    @Test
    void generateRejectsPasswordsExceedingBcryptByteLimit() {
        String password = "한".repeat(25);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> AdminDeletionPasswordHashGenerator.generate(password.toCharArray(), password.toCharArray()));

        assertEquals("삭제 확인 비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.", exception.getMessage());
    }

    @Test
    void generateFromStdinPreservesKoreanPassword() {
        String password = "보안확인용가짜암호열두글자";
        StringWriter output = new StringWriter();

        AdminDeletionPasswordHashGenerator.generateFromStdin(
                new BufferedReader(new StringReader(password + System.lineSeparator() + password)),
                new PrintWriter(output, true)
        );

        assertTrue(new BcryptPasswordEncoder().matches(password, output.toString().trim()));
    }

    @Test
    void generateFromStdinAcceptsWindowsPowerShellUtf8Bom() {
        String password = "보안확인용가짜암호열두글자";
        StringWriter output = new StringWriter();

        AdminDeletionPasswordHashGenerator.generateFromStdin(
                new BufferedReader(new StringReader("\uFEFF" + password + "\r\n" + password + "\r\n")),
                new PrintWriter(output, true)
        );

        assertTrue(new BcryptPasswordEncoder().matches(password, output.toString().trim()));
    }
}
