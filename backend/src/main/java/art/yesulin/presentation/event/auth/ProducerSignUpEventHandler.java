package art.yesulin.presentation.event.auth;

import art.yesulin.application.auth.EmailVerificationService;
import art.yesulin.domain.member.event.ProducerSignedUpEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ProducerSignUpEventHandler {

    private final EmailVerificationService emailVerificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(ProducerSignedUpEvent event) {
        emailVerificationService.sendVerification(event.email());
    }
}
