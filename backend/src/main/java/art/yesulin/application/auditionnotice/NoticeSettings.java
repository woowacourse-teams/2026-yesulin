package art.yesulin.application.auditionnotice;

import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public record NoticeSettings(
        @Value("${yesulin.sms.enabled:false}") boolean enabled,
        @Value("${yesulin.sms.sender:}") String sender,
        @Value("${yesulin.sms.sms-price:0}") BigDecimal smsPrice,
        @Value("${yesulin.sms.lms-price:0}") BigDecimal lmsPrice,
        @Value("${yesulin.sms.daily-limit:0}") int dailyLimit,
        @Value("${yesulin.sms.request-limit:0}") int requestLimit
) {

    public boolean configured() {
        return sender.matches("[0-9]{8,16}") && smsPrice.signum() > 0 && lmsPrice.signum() > 0
                && dailyLimit > 0 && requestLimit > 0 && requestLimit <= 500;
    }

    public BigDecimal price(String type) {
        return "SMS".equals(type) ? smsPrice : lmsPrice;
    }
}
