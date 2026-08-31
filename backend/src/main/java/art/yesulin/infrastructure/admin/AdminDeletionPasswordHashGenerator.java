package art.yesulin.infrastructure.admin;

import at.favre.lib.crypto.bcrypt.BCrypt;
import java.io.BufferedReader;
import java.io.Console;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public final class AdminDeletionPasswordHashGenerator {

    private static final int BCRYPT_COST = 12;
    private static final int MIN_PASSWORD_LENGTH = 12;
    private static final int MAX_PASSWORD_LENGTH = 128;

    private AdminDeletionPasswordHashGenerator() {
    }

    public static void main(String[] args) {
        if (args.length == 1 && "--stdin".equals(args[0])) {
            generateFromStdin(
                    new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8)),
                    new PrintWriter(System.out, true)
            );
            return;
        }
        Console console = System.console();
        if (console == null) {
            throw new IllegalStateException("대화형 터미널에서 실행해 주세요.");
        }
        char[] password = console.readPassword("삭제 확인 비밀번호: ");
        char[] confirmation = console.readPassword("삭제 확인 비밀번호 재입력: ");
        console.writer().println(generate(password, confirmation));
    }

    static void generateFromStdin(BufferedReader input, PrintWriter output) {
        char[] password = readPassword(input, true);
        char[] confirmation = null;
        try {
            confirmation = readPassword(input, false);
            output.println(generate(password, confirmation));
        } finally {
            Arrays.fill(password, '\0');
            if (confirmation != null) {
                Arrays.fill(confirmation, '\0');
            }
        }
    }

    static String generate(char[] password, char[] confirmation) {
        try {
            validate(password, confirmation);
            return BCrypt.withDefaults().hashToString(BCRYPT_COST, password);
        } finally {
            Arrays.fill(password, '\0');
            Arrays.fill(confirmation, '\0');
        }
    }

    private static void validate(char[] password, char[] confirmation) {
        if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("삭제 확인 비밀번호는 12~128자여야 합니다.");
        }
        if (!Arrays.equals(password, confirmation)) {
            throw new IllegalArgumentException("비밀번호 재입력이 일치하지 않습니다.");
        }
        ByteBuffer encoded = StandardCharsets.UTF_8.encode(CharBuffer.wrap(password));
        try {
            if (encoded.remaining() > 72) {
                throw new IllegalArgumentException("삭제 확인 비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.");
            }
        } finally {
            Arrays.fill(encoded.array(), (byte) 0);
        }
    }

    private static char[] readPassword(BufferedReader input, boolean firstLine) {
        try {
            String password = input.readLine();
            if (password == null) {
                throw new IllegalArgumentException("비밀번호 입력이 전달되지 않았습니다.");
            }
            if (firstLine && password.startsWith("\uFEFF")) {
                return password.substring(1).toCharArray();
            }
            return password.toCharArray();
        } catch (IOException exception) {
            throw new UncheckedIOException("비밀번호 입력을 읽지 못했습니다.", exception);
        }
    }
}
