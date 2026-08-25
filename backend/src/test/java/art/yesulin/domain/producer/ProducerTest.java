package art.yesulin.domain.producer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

class ProducerTest {

    private static final long MEMBER_ID = 1L;
    private static final String COMPANY_NAME = "예술인 컴퍼니";

    @Test
    void normalizesPhoneByRemovingNonDigits() {
        Producer producer = new Producer(MEMBER_ID, COMPANY_NAME, "010-1234-5678");

        assertThat(producer.getPhone()).isEqualTo("01012345678");
    }

    @Test
    void acceptsTenDigitPhone() {
        Producer producer = new Producer(MEMBER_ID, COMPANY_NAME, "0101234567");

        assertThat(producer.getPhone()).isEqualTo("0101234567");
    }

    @Test
    void rejectsPhoneLongerThanElevenDigits() {
        assertThatThrownBy(() -> new Producer(MEMBER_ID, COMPANY_NAME, "010123456789"))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(ProducerErrorCode.INVALID_PHONE);
    }

    @Test
    void rejectsPhoneNotStartingWithZeroOne() {
        assertThatThrownBy(() -> new Producer(MEMBER_ID, COMPANY_NAME, "0212345678"))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(ProducerErrorCode.INVALID_PHONE);
    }

    @Test
    void rejectsCompanyNameLongerThanMaximum() {
        String tooLongName = "가".repeat(101);

        assertThatThrownBy(() -> new Producer(MEMBER_ID, tooLongName, "01012345678"))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(ProducerErrorCode.INVALID_COMPANY_NAME);
    }

    @Test
    void rejectsBlankCompanyName() {
        assertThatThrownBy(() -> new Producer(MEMBER_ID, "  ", "01012345678"))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(ProducerErrorCode.INVALID_COMPANY_NAME);
    }

    @Test
    void updatesProfileFieldsWithTrimmedValues() {
        Producer producer = new Producer(MEMBER_ID, COMPANY_NAME, "01012345678");

        producer.updateCompanyName(" 새 컴퍼니 ");
        producer.updateContactName(" 김담당 ");
        producer.updateContactRole(" 캐스팅 담당 ");
        producer.updateDescription(" 공연 제작사입니다. ");

        assertThat(producer.getCompanyName()).isEqualTo("새 컴퍼니");
        assertThat(producer.getContactName()).isEqualTo("김담당");
        assertThat(producer.getContactRole()).isEqualTo("캐스팅 담당");
        assertThat(producer.getDescription()).isEqualTo("공연 제작사입니다.");
    }

    @Test
    void rejectsBlankContactName() {
        Producer producer = new Producer(MEMBER_ID, COMPANY_NAME, "01012345678");

        assertThatThrownBy(() -> producer.updateContactName("  "))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(ProducerErrorCode.INVALID_CONTACT_NAME);
    }

    @Test
    void clearsContactRoleAndDescriptionWithBlankValue() {
        Producer producer = new Producer(MEMBER_ID, COMPANY_NAME, "01012345678");
        producer.updateContactRole("캐스팅 담당");
        producer.updateDescription("소개");

        producer.updateContactRole("  ");
        producer.updateDescription("");

        assertThat(producer.getContactRole()).isNull();
        assertThat(producer.getDescription()).isNull();
    }

    @Test
    void rejectsDescriptionLongerThanMaximum() {
        Producer producer = new Producer(MEMBER_ID, COMPANY_NAME, "01012345678");

        assertThatThrownBy(() -> producer.updateDescription("가".repeat(201)))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(ProducerErrorCode.INVALID_DESCRIPTION);
    }

    @Test
    void rejectsBlankPhone() {
        assertThatThrownBy(() -> new Producer(MEMBER_ID, COMPANY_NAME, "  "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsNonPositiveMemberId() {
        assertThatThrownBy(() -> new Producer(0L, COMPANY_NAME, "01012345678"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
