package art.yesulin.legacy.application.submission.form;

import static org.junit.jupiter.api.Assertions.assertEquals;

import art.yesulin.legacy.domain.audition.form.AdditionalInformationField;
import art.yesulin.legacy.domain.audition.form.BasicInformationField;
import art.yesulin.legacy.domain.submission.SubmissionAdditionalInformationField;
import art.yesulin.legacy.domain.submission.SubmissionBasicInformationField;
import art.yesulin.legacy.domain.submission.SubmissionFieldSnapshot;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionFieldSnapshotFactoryTest {

    private final SubmissionFieldSnapshotFactory factory = new SubmissionFieldSnapshotFactory();

    @Test
    void mapsEveryAuditionFieldToSubmissionField() {
        SubmissionFormDefinition form = new SubmissionFormDefinition(
                List.of(BasicInformationField.values()),
                List.of(AdditionalInformationField.values()),
                List.of(),
                List.of(),
                List.of()
        );

        SubmissionFieldSnapshot snapshot = factory.create(form);

        assertEquals(List.of(SubmissionBasicInformationField.values()), snapshot.basicFields());
        assertEquals(List.of(SubmissionAdditionalInformationField.values()), snapshot.additionalFields());
    }
}
