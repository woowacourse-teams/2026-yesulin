package art.yesulin.producer.application;

import art.yesulin.auth.application.PasswordEncoder;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.producer.domain.Producer;
import art.yesulin.producer.domain.ProducerErrorCode;
import art.yesulin.producer.domain.ProducerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProducerSignUpService {

    private final MemberRepository memberRepository;
    private final ProducerRepository producerRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public ProducerResult signUp(SignUpProducerCommand command) {
        String email = command.email().trim().toLowerCase();
        if (memberRepository.findByEmail(email).isPresent()) {
            throw new BusinessException(ProducerErrorCode.DUPLICATE_EMAIL, "이미 가입된 이메일입니다.");
        }

        Member member = memberRepository.save(
                Member.ofProducer(email, passwordEncoder.encode(command.password())));
        Producer producer = producerRepository.save(
                new Producer(member.getId(), command.companyName(), command.phone()));

        return ProducerResult.of(member, producer);
    }
}
