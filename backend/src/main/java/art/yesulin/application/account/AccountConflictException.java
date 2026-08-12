package art.yesulin.application.account;

public final class AccountConflictException extends RuntimeException {

    public AccountConflictException() {
        super("이미 가입된 이메일입니다.");
    }
}
