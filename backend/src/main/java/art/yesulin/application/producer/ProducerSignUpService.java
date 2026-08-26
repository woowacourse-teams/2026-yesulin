package art.yesulin.application.producer;

import art.yesulin.application.auth.PasswordEncoder;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerErrorCode;
import art.yesulin.domain.producer.ProducerRepository;
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
