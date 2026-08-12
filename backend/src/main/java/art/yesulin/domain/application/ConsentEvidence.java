package art.yesulin.domain.application;

public record ConsentEvidence(// no-excuse-ok: domain value object
        boolean collectionAndUse,
        boolean thirdPartyProvision,
        boolean profileSave,
        String documentVersion,
        String disclosureJson) {
}
