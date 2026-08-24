package art.yesulin.domain.producer;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "producers")
public class Producer {

    private static final int MAX_COMPANY_NAME_LENGTH = 100;
    private static final String PHONE_PATTERN = "^01\\d{8,9}$";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false, updatable = false)
    private long memberId;

    @Column(name = "company_name", nullable = false, length = MAX_COMPANY_NAME_LENGTH)
    private String companyName;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Producer(long memberId, String companyName, String phone) {
        this.memberId = requirePositive(memberId, "회원 ID는 1 이상이어야 합니다.");
        this.companyName = normalizeCompanyName(companyName);
        this.phone = normalizePhone(phone);
    }

    private static String normalizeCompanyName(String value) {
        String companyName = requireText(value, "기획사·제작사명이 필요합니다.");
        if (companyName.length() > MAX_COMPANY_NAME_LENGTH) {
            throw new BusinessException(ProducerErrorCode.INVALID_COMPANY_NAME, "기획사·제작사명이 너무 깁니다.");
        }
        return companyName;
    }

    private static String normalizePhone(String value) {
        String phone = requireText(value, "휴대폰 번호가 필요합니다.").replaceAll("\\D", "");
        if (!phone.matches(PHONE_PATTERN)) {
            throw new BusinessException(ProducerErrorCode.INVALID_PHONE, "올바른 휴대폰 번호가 아닙니다.");
        }
        return phone;
    }
}
