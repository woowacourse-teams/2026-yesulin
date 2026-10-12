package art.yesulin.auth.infrastructure.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.ConversionService;
import org.springframework.core.convert.support.GenericConversionService;

/**
 * Spring Session JDBC의 기본값인 Java 직렬화 대신 {@link SessionAttributeJsonCodec}으로 세션 속성을 저장한다.
 * Spring Session은 빈 이름으로 주입받으므로, 다른 곳에 {@link ConversionService}로 주입되지 않게 기본 후보에서 뺀다.
 */
@Configuration
public class SessionSerializationConfiguration {

    @Bean(defaultCandidate = false)
    public ConversionService springSessionConversionService() {
        SessionAttributeJsonCodec codec = new SessionAttributeJsonCodec(getClass().getClassLoader());
        GenericConversionService conversionService = new GenericConversionService();
        conversionService.addConverter(Object.class, byte[].class, codec::serialize);
        conversionService.addConverter(byte[].class, Object.class, codec::deserialize);
        return conversionService;
    }
}
