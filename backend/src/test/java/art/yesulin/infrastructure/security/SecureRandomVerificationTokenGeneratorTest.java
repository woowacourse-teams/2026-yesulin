package art.yesulin.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SecureRandomVerificationTokenGeneratorTest {

    private final SecureRandomVerificationTokenGenerator generator =
            new SecureRandomVerificationTokenGenerator();

    @Test
    void generatesDifferentUrlSafe256BitTokens() {
        String first = generator.generate();
        String second = generator.generate();

        assertThat(first).hasSize(43).matches("[A-Za-z0-9_-]+");
        assertThat(second).hasSize(43).isNotEqualTo(first);
    }
}
