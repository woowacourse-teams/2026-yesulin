CREATE TABLE feedback_images (
    feedback_id BIGINT NOT NULL,
    sort_order INT NOT NULL,
    object_key VARCHAR(120) NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    size_bytes BIGINT NOT NULL,
    PRIMARY KEY (feedback_id, sort_order),
    CONSTRAINT fk_feedback_images_feedback FOREIGN KEY (feedback_id) REFERENCES feedbacks (id)
);
