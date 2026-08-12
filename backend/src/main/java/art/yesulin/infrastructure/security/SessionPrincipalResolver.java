package art.yesulin.infrastructure.security;

import art.yesulin.infrastructure.account.AccountJpaEntity;
import art.yesulin.infrastructure.account.AccountJpaRepository;
import org.springframework.security.core.Authentication;

public final class SessionPrincipalResolver {

    private final AccountJpaRepository accountRepository;

    public SessionPrincipalResolver(AccountJpaRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public SessionPrincipal resolve(Authentication authentication) {
        AccountJpaEntity account = accountRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("인증 계정이 존재하지 않습니다."));
        return new SessionPrincipal(account.id(), account.email());
    }
}
