package art.yesulin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.server.Cookie.SameSite;
import org.springframework.boot.web.server.autoconfigure.ServerProperties;
import org.springframework.context.annotation.Import;

/**
 * 세션 쿠키 보안 속성은 설정으로만 정해지므로 값이 지워지면 조용히 약해진다.
 * 그래서 바인딩된 값을 직접 확인한다.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:session-cookie;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class SessionCookieConfigurationTest {

    @Autowired
    private ServerProperties serverProperties;

    @Test
    void blocksScriptAccessToSessionCookie() {
        assertTrue(serverProperties.getServlet().getSession().getCookie().getHttpOnly());
    }

    @Test
    void limitsCrossSiteSendingOfSessionCookie() {
        assertEquals(SameSite.LAX, serverProperties.getServlet().getSession().getCookie().getSameSite());
    }

    @Test
    void expiresIdleSession() {
        assertEquals(Duration.ofMinutes(30), serverProperties.getServlet().getSession().getTimeout());
    }
}
