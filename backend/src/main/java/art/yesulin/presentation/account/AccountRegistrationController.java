package art.yesulin.presentation.account;

import art.yesulin.application.account.AccountRegistrationService;
import art.yesulin.application.account.ApplicantRegistrationResult;
import art.yesulin.application.account.ProducerRegistrationResult;
import art.yesulin.infrastructure.security.ActiveCompanySession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AccountRegistrationController {

    private final AccountRegistrationService registrationService;

    public AccountRegistrationController(AccountRegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping("/api/v1/applicants")
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicantRegistrationResult registerApplicant(
            @Valid @RequestBody ApplicantRegistrationRequest request) {
        return registrationService.registerApplicant(request.email(), request.password());
    }

    @PostMapping("/api/v1/producers")
    @ResponseStatus(HttpStatus.CREATED)
    public ProducerRegistrationResult registerProducer(
            @Valid @RequestBody ProducerRegistrationRequest request,
            HttpServletRequest httpRequest) {
        ProducerRegistrationResult result = registrationService.registerProducer(
                request.email(),
                request.password(),
                request.companyName(),
                request.businessNumber(),
                request.representativeName(),
                request.contactName());
        ActiveCompanySession.select(httpRequest.getSession(), result.companyId());
        return result;
    }
}
