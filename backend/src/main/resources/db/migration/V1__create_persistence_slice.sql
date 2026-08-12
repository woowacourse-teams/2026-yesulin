CREATE TABLE accounts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_accounts_email UNIQUE (email),
    CONSTRAINT ck_accounts_status CHECK (status IN ('ACTIVE', 'DISABLED'))
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE applicants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_applicants_account UNIQUE (account_id),
    CONSTRAINT fk_applicants_account FOREIGN KEY (account_id) REFERENCES accounts (id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE companies (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_id VARCHAR(100) NULL,
    name VARCHAR(200) NOT NULL,
    business_number VARCHAR(30) NULL,
    representative_name VARCHAR(100) NULL,
    contact_name VARCHAR(100) NULL,
    contact_email VARCHAR(320) NULL,
    verification_status VARCHAR(20) NOT NULL,
    verified_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_companies_source UNIQUE (source_id),
    CONSTRAINT ck_companies_verification CHECK (
        verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')
    )
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE company_members (
    id BIGINT NOT NULL AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    role VARCHAR(30) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_company_members_account_company UNIQUE (account_id, company_id),
    CONSTRAINT ck_company_members_role CHECK (role IN ('ADMIN')),
    CONSTRAINT fk_company_members_account FOREIGN KEY (account_id) REFERENCES accounts (id),
    CONSTRAINT fk_company_members_company FOREIGN KEY (company_id) REFERENCES companies (id),
    INDEX ix_company_members_company (company_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE performances (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_id VARCHAR(100) NULL,
    company_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    venue VARCHAR(200) NULL,
    poster_url VARCHAR(2048) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_performances_source UNIQUE (source_id),
    CONSTRAINT fk_performances_company FOREIGN KEY (company_id) REFERENCES companies (id),
    INDEX ix_performances_company (company_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE postings (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_id VARCHAR(100) NULL,
    performance_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL,
    allows_multiple_roles BOOLEAN NOT NULL,
    recruitment_starts_at DATETIME(6) NOT NULL,
    recruitment_ends_at DATETIME(6) NOT NULL,
    application_guide TEXT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_postings_source UNIQUE (source_id),
    CONSTRAINT ck_postings_status CHECK (status IN ('UPCOMING', 'OPEN', 'CLOSED')),
    CONSTRAINT ck_postings_period CHECK (recruitment_starts_at < recruitment_ends_at),
    CONSTRAINT fk_postings_performance FOREIGN KEY (performance_id) REFERENCES performances (id),
    INDEX ix_postings_performance (performance_id),
    INDEX ix_postings_status_period (status, recruitment_starts_at, recruitment_ends_at)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE roles (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_id VARCHAR(100) NULL,
    posting_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    quota INT NULL,
    gender_condition VARCHAR(30) NULL,
    age_min INT NULL,
    age_max INT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_roles_source UNIQUE (source_id),
    CONSTRAINT uq_roles_posting_name UNIQUE (posting_id, name),
    CONSTRAINT ck_roles_quota CHECK (quota IS NULL OR quota > 0),
    CONSTRAINT ck_roles_age CHECK (
        (age_min IS NULL OR age_min >= 0)
        AND (age_max IS NULL OR age_max >= 0)
        AND (age_min IS NULL OR age_max IS NULL OR age_min <= age_max)
    ),
    CONSTRAINT fk_roles_posting FOREIGN KEY (posting_id) REFERENCES postings (id),
    INDEX ix_roles_posting (posting_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE posting_fields (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_id VARCHAR(100) NULL,
    posting_id BIGINT NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    required BOOLEAN NOT NULL,
    custom BOOLEAN NOT NULL,
    section_name VARCHAR(50) NOT NULL,
    input_type VARCHAR(30) NOT NULL,
    display_order INT NOT NULL,
    config_json JSON NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_posting_fields_posting_key UNIQUE (posting_id, field_key),
    CONSTRAINT fk_posting_fields_posting FOREIGN KEY (posting_id) REFERENCES postings (id),
    INDEX ix_posting_fields_posting_order (posting_id, display_order)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE applicant_profiles (
    id BIGINT NOT NULL AUTO_INCREMENT,
    applicant_id BIGINT NOT NULL,
    activity_name VARCHAR(100) NULL,
    name VARCHAR(100) NULL,
    height INT NULL,
    weight INT NULL,
    birth_date DATE NULL,
    gender VARCHAR(30) NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(320) NULL,
    residence VARCHAR(200) NULL,
    additional_information JSON NOT NULL,
    consented_at DATETIME(6) NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_applicant_profiles_applicant UNIQUE (applicant_id),
    CONSTRAINT fk_applicant_profiles_applicant FOREIGN KEY (applicant_id) REFERENCES applicants (id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE profile_photos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    applicant_profile_id BIGINT NOT NULL,
    photo_order INT NOT NULL,
    url VARCHAR(2048) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_profile_photos_order UNIQUE (applicant_profile_id, photo_order),
    CONSTRAINT ck_profile_photos_order CHECK (photo_order BETWEEN 1 AND 10),
    CONSTRAINT fk_profile_photos_profile FOREIGN KEY (applicant_profile_id)
        REFERENCES applicant_profiles (id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE drafts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    posting_id BIGINT NOT NULL,
    account_id BIGINT NULL,
    content_json JSON NOT NULL,
    revision BIGINT NOT NULL,
    client_modified_at DATETIME(6) NOT NULL,
    server_modified_at DATETIME(6) NOT NULL,
    status VARCHAR(20) NOT NULL,
    submitted_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_drafts_account_posting UNIQUE (account_id, posting_id),
    CONSTRAINT ck_drafts_revision CHECK (revision > 0),
    CONSTRAINT ck_drafts_status CHECK (status IN ('ACTIVE', 'SUBMITTED')),
    CONSTRAINT fk_drafts_posting FOREIGN KEY (posting_id) REFERENCES postings (id),
    CONSTRAINT fk_drafts_account FOREIGN KEY (account_id) REFERENCES accounts (id),
    INDEX ix_drafts_posting_status (posting_id, status),
    INDEX ix_drafts_account_status (account_id, status)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE applications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_id VARCHAR(100) NULL,
    applicant_id BIGINT NOT NULL,
    posting_id BIGINT NOT NULL,
    draft_id BIGINT NULL,
    name VARCHAR(100) NOT NULL,
    height INT NOT NULL,
    weight INT NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(30) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(320) NOT NULL,
    residence VARCHAR(200) NOT NULL,
    submitted_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_applications_source UNIQUE (source_id),
    CONSTRAINT uq_applications_applicant_posting UNIQUE (applicant_id, posting_id),
    CONSTRAINT uq_applications_draft UNIQUE (draft_id),
    CONSTRAINT ck_applications_body CHECK (height > 0 AND weight > 0),
    CONSTRAINT fk_applications_applicant FOREIGN KEY (applicant_id) REFERENCES applicants (id),
    CONSTRAINT fk_applications_posting FOREIGN KEY (posting_id) REFERENCES postings (id),
    CONSTRAINT fk_applications_draft FOREIGN KEY (draft_id) REFERENCES drafts (id),
    INDEX ix_applications_posting (posting_id),
    INDEX ix_applications_applicant_submitted (applicant_id, submitted_at)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE application_roles (
    application_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    role_snapshot JSON NOT NULL,
    PRIMARY KEY (application_id, role_id),
    CONSTRAINT fk_application_roles_application FOREIGN KEY (application_id)
        REFERENCES applications (id),
    CONSTRAINT fk_application_roles_role FOREIGN KEY (role_id) REFERENCES roles (id),
    INDEX ix_application_roles_role (role_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE application_answers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    answer_json JSON NOT NULL,
    answer_order INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_application_answers_key UNIQUE (application_id, field_key),
    CONSTRAINT fk_application_answers_application FOREIGN KEY (application_id)
        REFERENCES applications (id),
    INDEX ix_application_answers_application_order (application_id, answer_order)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE application_snapshots (
    application_id BIGINT NOT NULL,
    schema_version VARCHAR(30) NOT NULL,
    snapshot_json JSON NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (application_id),
    CONSTRAINT fk_application_snapshots_application FOREIGN KEY (application_id)
        REFERENCES applications (id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE consent_snapshots (
    id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    consent_type VARCHAR(40) NOT NULL,
    document_version VARCHAR(50) NOT NULL,
    disclosure_json JSON NOT NULL,
    agreed_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_consent_snapshots_type UNIQUE (application_id, consent_type),
    CONSTRAINT ck_consent_snapshots_type CHECK (
        consent_type IN ('COLLECTION_AND_USE', 'THIRD_PARTY_PROVISION', 'PROFILE_SAVE')
    ),
    CONSTRAINT fk_consent_snapshots_application FOREIGN KEY (application_id)
        REFERENCES applications (id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
