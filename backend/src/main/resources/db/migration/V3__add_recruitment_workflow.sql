CREATE TABLE performance_role_templates (
    id BIGINT NOT NULL AUTO_INCREMENT,
    performance_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    gender_condition VARCHAR(30) NOT NULL,
    age_min INT NOT NULL,
    age_max INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_performance_role_templates_name UNIQUE (performance_id, name),
    CONSTRAINT ck_performance_role_templates_gender CHECK (
        gender_condition IN ('ANY', 'MALE', 'FEMALE')
    ),
    CONSTRAINT ck_performance_role_templates_age CHECK (
        age_min >= 0 AND age_max >= age_min
    ),
    CONSTRAINT fk_performance_role_templates_performance FOREIGN KEY (performance_id)
        REFERENCES performances (id),
    INDEX ix_performance_role_templates_performance (performance_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

ALTER TABLE roles ADD COLUMN template_id BIGINT NULL AFTER posting_id;
ALTER TABLE roles ADD CONSTRAINT fk_roles_template FOREIGN KEY (template_id)
    REFERENCES performance_role_templates (id);

CREATE TABLE screening_rounds (
    id BIGINT NOT NULL AUTO_INCREMENT,
    role_id BIGINT NOT NULL,
    round_number INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    scheduled_date DATE NULL,
    note TEXT NULL,
    status VARCHAR(20) NOT NULL,
    closed_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_screening_rounds_role_round UNIQUE (role_id, round_number),
    CONSTRAINT ck_screening_rounds_number CHECK (round_number BETWEEN 1 AND 3),
    CONSTRAINT ck_screening_rounds_status CHECK (status IN ('LOCKED', 'OPEN', 'CLOSED')),
    CONSTRAINT fk_screening_rounds_role FOREIGN KEY (role_id) REFERENCES roles (id),
    INDEX ix_screening_rounds_role (role_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE application_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    round_number INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    memo VARCHAR(500) NULL,
    note TEXT NULL,
    reviewed_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_application_reviews_target UNIQUE (application_id, role_id, round_number),
    CONSTRAINT ck_application_reviews_round CHECK (round_number BETWEEN 1 AND 3),
    CONSTRAINT ck_application_reviews_status CHECK (
        status IN ('PENDING', 'PASS', 'FAIL', 'ABSENT', 'ETC')
    ),
    CONSTRAINT fk_application_reviews_application FOREIGN KEY (application_id)
        REFERENCES applications (id),
    CONSTRAINT fk_application_reviews_role FOREIGN KEY (role_id) REFERENCES roles (id),
    INDEX ix_application_reviews_role_round (role_id, round_number)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

ALTER TABLE companies ADD COLUMN contact_role VARCHAR(100) NULL AFTER contact_name;
ALTER TABLE companies ADD COLUMN logo_url VARCHAR(2048) NULL AFTER contact_email;
ALTER TABLE companies ADD COLUMN description TEXT NULL AFTER logo_url;
