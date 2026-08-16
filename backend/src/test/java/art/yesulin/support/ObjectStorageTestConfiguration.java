package art.yesulin.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration
public class ObjectStorageTestConfiguration {

    @Bean
    @Primary
    FakeObjectStorage fakeObjectStorage() {
        return new FakeObjectStorage();
    }
}
