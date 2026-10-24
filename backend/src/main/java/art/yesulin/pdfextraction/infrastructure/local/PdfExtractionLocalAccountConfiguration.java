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
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/** 별도 H2 DB에서만 만드는 가상 계정. 실제 회원이나 운영 DB는 사용하지 않는다. */
@Configuration(proxyBeanMethods = false)
@Profile("pdf-extraction-local")
public class PdfExtractionLocalAccountConfiguration {

    @Bean
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
