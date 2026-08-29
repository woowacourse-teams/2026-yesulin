package art.yesulin.application.diagnostic;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class UploadDiagnosticService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UploadDiagnosticService.class);

    public void record(UUID incidentId, UploadDiagnosticCommand command) {
        LOGGER.warn(
                "UPLOAD_DIAGNOSTIC incidentId={} flow={} stage={} attempt={} result={} errorCode={} httpStatus={} "
                        + "serviceWorkerControlled={} platform={} browser={}",
                incidentId,
                command.uploadFlow(),
                command.stage(),
                command.attempt(),
                command.result(),
                command.errorCode(),
                command.httpStatus(),
                command.serviceWorkerControlled(),
                command.coarsePlatform(),
                command.coarseBrowser()
        );
    }
}
