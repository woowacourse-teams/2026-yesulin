package art.yesulin.infrastructure.admin;

import art.yesulin.application.auth.PasswordEncoder;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 설정에 적힌 운영자 계정을 기동 시점에 맞춘다. 설정이 비어 있으면 아무 것도 하지 않는다.
 * 이미 다른 유형으로 쓰이는 이메일은 조용히 승격하지 않고 기동을 멈춘다.
 */
@Component
@RequiredArgsConstructor
@EnableConfigurationProperties(AdminAccountProperties.class)
public class AdminAccountInitializer implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(AdminAccountInitializer.class);

    private final AdminAccountProperties properties;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<AdminAccount> accounts = parseAccounts(properties.accounts());
        if (accounts.isEmpty()) {
            LOGGER.info("운영자 계정 설정이 없어 운영 대시보드 계정을 만들지 않는다.");
            return;
        }
        for (AdminAccount account : accounts) {
            synchronize(account);
        }
        LOGGER.info("운영자 계정 {}개를 확인했다.", accounts.size());
    }

    private List<AdminAccount> parseAccounts(String configured) {
        if (configured == null || configured.isBlank()) {
            return List.of();
        }
        List<AdminAccount> accounts = new ArrayList<>();
        for (String entry : configured.split(",")) {
            if (!entry.isBlank()) {
                accounts.add(AdminAccount.parse(entry));
            }
        }
        return accounts;
    }

    private void synchronize(AdminAccount account) {
        Optional<Member> existing = memberRepository.findByEmail(account.email());
        if (existing.isEmpty()) {
            memberRepository.save(Member.ofAdmin(account.email(), passwordEncoder.encode(account.password())));
            return;
        }

        Member member = existing.get();
        if (!member.isAdmin()) {
            throw new IllegalStateException("운영자 계정 이메일이 이미 다른 회원 유형으로 사용 중입니다.");
        }
        if (!passwordEncoder.matches(account.password(), member.getPassword())) {
            member.replacePassword(passwordEncoder.encode(account.password()));
            memberRepository.save(member);
        }
    }
}
