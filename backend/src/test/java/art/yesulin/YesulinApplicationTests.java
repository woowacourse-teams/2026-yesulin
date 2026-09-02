package art.yesulin;

import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:context;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "yesulin.social-login.enabled=true",
        "yesulin.social-login.failure-redirect=https://yesulin.art/login?socialLoginError=true",
        "yesulin.social-login.providers.kakao.client-id=kakao-id",
        "yesulin.social-login.providers.kakao.client-secret=kakao-secret",
        "yesulin.social-login.providers.naver.client-id=naver-id",
        "yesulin.social-login.providers.naver.client-secret=naver-secret",
        "yesulin.social-login.providers.google.client-id=google-id",
        "yesulin.social-login.providers.google.client-secret=google-secret"
})
@Import(ObjectStorageTestConfiguration.class)
class YesulinApplicationTests {

    @Test
    void contextLoads() {
    }
}
