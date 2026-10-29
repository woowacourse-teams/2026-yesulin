package art.yesulin.event.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class EventBankAccountTest {

    @Test
    void trimsDisplayValuesWithoutLosingLeadingZerosOrSeparators() {
        EventBankAccount account = new EventBankAccount(" 테스트은행 ", " 001-002 003 ", " 예술인 ");
        assertEquals("테스트은행", account.getBankName());
        assertEquals("001-002 003", account.getAccountNumber());
        assertEquals("예술인", account.getAccountHolder());
    }

    @Test
    void rejectsPartialAccountInvalidNumberAndOversizedFields() {
        assertThrows(BusinessException.class, () -> new EventBankAccount("", "12345", "예금주"));
        assertThrows(BusinessException.class, () -> new EventBankAccount("은행", "12345", " "));
        assertThrows(BusinessException.class, () -> new EventBankAccount("은행", "https://example.com", "예금주"));
        assertThrows(BusinessException.class, () -> new EventBankAccount("은행", "---", "예금주"));
        assertThrows(BusinessException.class, () -> new EventBankAccount("은행", "1".repeat(51), "예금주"));
    }

    @Test
    void accountIsStoredOnlyWhileRegistrationConfirmationIsEnabled() {
        EventBankAccount account = new EventBankAccount("은행", "001-002-003", "예금주");
        EventContent enabled = new EventContent("제목", null, "본문", null, null, null, null,
                true, null, null, null, true, "입금 안내", null, account);
        Event event = new Event(enabled, null, null, 1L, Instant.now());
        assertEquals(account, event.getRegistrationBankAccount());
        event.write(new EventContent("제목", null, "본문", null, null, null, null,
                true, null, null, null, false, "안내", null, account), null, null, Instant.now());
        assertNull(event.getRegistrationBankAccount());
        event.write(new EventContent("제목", null, "본문", null, null, null, null,
                false, null, null, null, true, "안내", null, account), null, null, Instant.now());
        assertNull(event.getRegistrationBankAccount());
    }
}
