package art.yesulin.infrastructure.security;

import java.time.Duration;
import org.springframework.boot.web.server.Cookie;
import org.springframework.boot.web.server.autoconfigure.ServerProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration
public class SessionCookieConfiguration {

    @Bean
    public CookieSerializer sessionCookieSerializer(ServerProperties serverProperties) {
        Cookie cookie = serverProperties.getServlet().getSession().getCookie();
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        configureName(serializer, cookie.getName());
        configureDomain(serializer, cookie.getDomain());
        configurePath(serializer, cookie.getPath());
        configureHttpOnly(serializer, cookie.getHttpOnly());
        configureSecure(serializer, cookie.getSecure());
        configureMaxAge(serializer, cookie.getMaxAge());
        configureSameSite(serializer, cookie.getSameSite());
        configurePartitioned(serializer, cookie.getPartitioned());
        return serializer;
    }

    private void configureName(DefaultCookieSerializer serializer, String name) {
        if (name != null) {
            serializer.setCookieName(name);
        }
    }

    private void configureDomain(DefaultCookieSerializer serializer, String domain) {
        if (domain != null) {
            serializer.setDomainName(domain);
        }
    }

    private void configurePath(DefaultCookieSerializer serializer, String path) {
        if (path != null) {
            serializer.setCookiePath(path);
        }
    }

    private void configureHttpOnly(DefaultCookieSerializer serializer, Boolean httpOnly) {
        if (httpOnly != null) {
            serializer.setUseHttpOnlyCookie(httpOnly);
        }
    }

    private void configureSecure(DefaultCookieSerializer serializer, Boolean secure) {
        if (secure != null) {
            serializer.setUseSecureCookie(secure);
        }
    }

    private void configureMaxAge(DefaultCookieSerializer serializer, Duration maxAge) {
        if (maxAge != null) {
            serializer.setCookieMaxAge(Math.toIntExact(maxAge.toSeconds()));
        }
    }

    private void configureSameSite(DefaultCookieSerializer serializer, Cookie.SameSite sameSite) {
        if (sameSite != null) {
            serializer.setSameSite(sameSite.attributeValue());
        }
    }

    private void configurePartitioned(DefaultCookieSerializer serializer, Boolean partitioned) {
        if (partitioned != null) {
            serializer.setPartitioned(partitioned);
        }
    }
}
