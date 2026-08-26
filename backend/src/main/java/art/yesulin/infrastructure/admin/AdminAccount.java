package art.yesulin.infrastructure.admin;

/**
 * 설정에서 읽은 운영자 계정이다. record 기본 toString이 비밀번호를 그대로 출력하지 않도록 직접 재정의한다.
 */
record AdminAccount(String email, String password) {

    private static final int MIN_PASSWORD_LENGTH = 12;

    @Override
    public String toString() {
        return "AdminAccount[email=%s, password=***]".formatted(email);
    }

    static AdminAccount parse(String entry) {
        int separator = entry.indexOf(':');
        if (separator < 0) {
            throw new IllegalStateException("운영자 계정 설정은 email:password 형식이어야 합니다.");
        }
        String email = entry.substring(0, separator).trim();
        String password = entry.substring(separator + 1).trim();
        if (email.isEmpty() || !email.contains("@")) {
            throw new IllegalStateException("운영자 계정 이메일이 올바르지 않습니다.");
        }
        if (password.contains(",")) {
            throw new IllegalStateException("운영자 계정 비밀번호에는 쉼표를 쓸 수 없습니다.");
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException("운영자 계정 비밀번호는 %d자 이상이어야 합니다.".formatted(MIN_PASSWORD_LENGTH));
        }
        return new AdminAccount(email, password);
    }
}
