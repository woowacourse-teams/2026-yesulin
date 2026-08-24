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

    /**
     * 가입 직후 계정은 PENDING이며 운영진 확인 후에만 공연·공고 기능을 사용할 수 있다.
     */
    @Transactional
    public ProducerResult signUp(SignUpProducerCommand command) {
        String email = command.email().trim().toLowerCase();
        if (memberRepository.findByEmail(email).isPresent()) {
            throw new BusinessException(ProducerErrorCode.DUPLICATE_EMAIL, "이미 가입된 이메일입니다.");
        }

        Member member = memberRepository.save(
                Member.ofPendingProducer(email, passwordEncoder.encode(command.password())));
        Producer producer = producerRepository.save(
                new Producer(member.getId(), command.companyName(), command.phone()));

        return ProducerResult.of(member, producer);
    }
}
