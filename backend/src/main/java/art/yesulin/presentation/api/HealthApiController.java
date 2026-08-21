package art.yesulin.presentation.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthApiController {

    @GetMapping
    public String check() {
        return "OK";
    }
}
