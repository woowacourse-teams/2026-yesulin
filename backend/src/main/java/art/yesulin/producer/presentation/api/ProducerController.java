package art.yesulin.producer.presentation.api;

import art.yesulin.producer.application.ProducerResult;
import art.yesulin.producer.application.ProducerSignUpService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/producers")
@RequiredArgsConstructor
public class ProducerController {

    private final ProducerSignUpService producerSignUpService;

    @PostMapping
    public ResponseEntity<ProducerResult> signUp(@Valid @RequestBody SignUpProducerRequest request) {
        ProducerResult result = producerSignUpService.signUp(request.toCommand());
        return ResponseEntity.created(URI.create("/api/v1/producers/" + result.memberId())).body(result);
    }
}
