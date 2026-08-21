package art.yesulin.application.auth;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public MemberPrincipal login(String email, String password) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(
                        AuthErrorCode.INVALID_CREDENTIALS, "이메일 또는 비밀번호가 올바르지 않습니다."
                ));

        if (!member.hasPassword() || !passwordEncoder.matches(password, member.getPassword())) {
            throw new BusinessException(
                    AuthErrorCode.INVALID_CREDENTIALS, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        return new MemberPrincipal(member.getId(), member.getType());
    }
}
