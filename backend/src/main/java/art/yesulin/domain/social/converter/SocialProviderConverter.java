package art.yesulin.domain.social.converter;

import art.yesulin.application.auth.social.SocialProvider;
import art.yesulin.domain.common.converter.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class SocialProviderConverter extends StringEnumConverter<SocialProvider> {

    public SocialProviderConverter() {
        super(SocialProvider.class);
    }
}
