package art.yesulin.infrastructure.seed;

import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("seed")
public class SeedImportRunner implements CommandLineRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(SeedImportRunner.class);

    private final SeedFileReader reader;
    private final SeedImportService importService;
    private final ConfigurableApplicationContext context;
    private final Path seedPath;
    private final String producerPassword;

    public SeedImportRunner(
            SeedFileReader reader,
            SeedImportService importService,
            ConfigurableApplicationContext context,
            @Value("${yesulin.seed.path}") String seedPath,
            @Value("${yesulin.seed.producer-password}") String producerPassword) {
        this.reader = reader;
        this.importService = importService;
        this.context = context;
        this.seedPath = Path.of(seedPath);
        this.producerPassword = producerPassword;
    }

    @Override
    public void run(String... args) {
        SeedData seed = reader.read(seedPath);
        SeedImportResult result = importService.importSeed(seed, producerPassword);
        LOGGER.info(
                "Seed import completed: companies={}, performances={}, postings={}, roles={}, fields={}",
                result.companies(), result.performances(), result.postings(), result.roles(),
                result.postingFields());
        SpringApplication.exit(context);
    }
}
