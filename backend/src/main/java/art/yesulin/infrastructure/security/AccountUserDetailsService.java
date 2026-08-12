package art.yesulin.infrastructure.security;

import art.yesulin.infrastructure.account.AccountJpaEntity;
import art.yesulin.infrastructure.account.AccountJpaRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AccountUserDetailsService implements UserDetailsService {

    private final AccountJpaRepository accountRepository;

    public AccountUserDetailsService(AccountJpaRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        AccountJpaEntity account = accountRepository.findByEmail(username.toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("계정을 찾을 수 없습니다."));
        return User.withUsername(account.email())
                .password(account.passwordHash())
                .roles("ACCOUNT")
                .disabled(!"ACTIVE".equals(account.status()))
                .build();
    }
}
