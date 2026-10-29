package art.yesulin.event.domain;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 운영자가 참가비·보증금 안내에 공개하는 입금 계좌. 결제·입금 확인은 수행하지 않는다. */
@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventBankAccount {

    public static final int MAX_LENGTH = 50;

    @Column(name = "registration_bank_name", length = MAX_LENGTH)
    private String bankName;

    @Column(name = "registration_account_number", length = MAX_LENGTH)
    private String accountNumber;

    @Column(name = "registration_account_holder", length = MAX_LENGTH)
    private String accountHolder;

    public EventBankAccount(String bankName, String accountNumber, String accountHolder) {
        this.bankName = text(bankName, "은행명");
        this.accountNumber = text(accountNumber, "계좌번호");
        this.accountHolder = text(accountHolder, "예금주");
        if (!this.accountNumber.matches("[0-9](?:[0-9 -]*[0-9])?")) {
            throw new BusinessException(EventErrorCode.INVALID_INPUT, "계좌번호는 숫자·하이픈·공백으로 입력해 주세요.");
        }
    }

    private static String text(String value, String label) {
        String normalized = value == null ? "" : value.strip();
        if (normalized.isEmpty() || normalized.length() > MAX_LENGTH) {
            throw new BusinessException(EventErrorCode.INVALID_INPUT, "%s는 1~%d자로 입력해 주세요.", label, MAX_LENGTH);
        }
        return normalized;
    }
}
