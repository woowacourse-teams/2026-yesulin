package art.yesulin.pdfextraction.infrastructure.local;

import art.yesulin.auth.application.PasswordEncoder;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.infrastructure.mail.MailSender;
import art.yesulin.producer.domain.Producer;
import art.yesulin.producer.domain.ProducerRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/** 명시적으로 켠 로컬 검증에서만 사용하는 가상 계정과 메일 대체 발송기. */
@Configuration(proxyBeanMethods = false)
@Profile("local & !test")
@ConditionalOnProperty(prefix = "yesulin.audit", name = "local-fixtures-enabled", havingValue = "true")
public class PdfExtractionLocalAccountConfiguration {

    @Bean
    @ConditionalOnProperty(prefix = "yesulin.mail", name = "enabled", havingValue = "false")
    MailSender pdfLocalMailSender() {
        return message -> {
            // 이 로컬 확인 환경에서는 메일을 외부로 보내지 않는다.
        };
    }

    @Bean
    CommandLineRunner pdfLocalAccount(MemberRepository members, ProducerRepository producers, PasswordEncoder encoder) {
        return arguments -> {
            String email = "pdf-local@example.test";
            if (members.findByEmail(email).isPresent()) {
                return;
            }
            Member member = members.save(new Member(email, encoder.encode("PdfLocal123!"),
                    MemberType.PRODUCER, MemberStatus.ACTIVE));
            producers.save(new Producer(member.getId(), "PDF 로컬 확인용 공연사", "01000000000"));
        };
    }
}
