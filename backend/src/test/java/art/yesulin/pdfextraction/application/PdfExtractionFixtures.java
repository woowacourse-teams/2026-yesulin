package art.yesulin.pdfextraction.application;

import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.time.Instant;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

public final class PdfExtractionFixtures {

    public static final Instant NOW = Instant.parse("2026-10-23T00:00:00Z");
    public static final ObjectMapper MAPPER = JsonMapper.builder().build();

    private PdfExtractionFixtures() {
    }

    public static PdfExtractionJob job(long ownerId) {
        return new PdfExtractionJob(ownerId, "a.pdf", 100, NOW, NOW.plusSeconds(600));
    }

    public static ObjectNode manifest(PdfExtractionJob job, PdfExtractionStorage storage, String status,
                                      String... pageTexts) {
        ObjectNode root = MAPPER.createObjectNode();
        root.put("jobId", job.getId());
        root.put("pipelineVersion", "pdfium-v1");
        root.putObject("source").put("key", storage.sourceFileKey(job)).put("sha256", "abc");
        root.put("status", status);
        root.putArray("warnings").addObject().put("code", "LOW_TEXT").put("page", 1);
        ArrayNode pages = root.putArray("pages");
        for (int index = 0; index < pageTexts.length; index++) {
            ObjectNode page = pages.addObject();
            page.put("number", index + 1);
            page.put("text", pageTexts[index]);
            page.put("needsOcr", false);
            page.putArray("images").add(image(storage.imageFileKeyPrefix(job) + "p" + (index + 1) + ".png"));
        }
        return root;
    }

    public static ObjectNode page(ObjectNode manifest, int index) {
        return (ObjectNode) manifest.get("pages").get(index);
    }

    public static ArrayNode images(ObjectNode manifest, int pageIndex) {
        return (ArrayNode) page(manifest, pageIndex).get("images");
    }

    public static ObjectNode image(String key) {
        ObjectNode image = MAPPER.createObjectNode();
        image.put("status", "EXTRACTED");
        image.put("key", key);
        image.put("url", "https://temporary.example/signed?signature=secret");
        return image;
    }

    public static ReceivePdfExtractionResultCommand command(PdfExtractionJob job, PdfExtractionStorage storage,
                                                            ObjectNode manifest) {
        return new ReceivePdfExtractionResultCommand(job.getId(), storage.sourceFileKey(job), "pdfium-v1", manifest);
    }
}
