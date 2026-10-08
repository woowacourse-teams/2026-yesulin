package art.yesulin.auth.domain.social.converter;

import art.yesulin.auth.application.social.SocialProvider;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class SocialProviderConverter extends StringEnumConverter<SocialProvider> {

    public SocialProviderConverter() {
        super(SocialProvider.class);
    }
}
