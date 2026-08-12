# Backend persistence slice design

## Status

- Approved by the user on 2026-08-12.
- Scope: `backend/` and backend/DB documentation only.
- The frontend and its MSW contracts are not changed by this work.

## Identity and company membership

- `Account` owns the globally unique login email, password hash, session identity and account status.
- Applicant and producer capabilities remain separate domain records.
- An account may own one `Applicant` and zero or more `CompanyMember` memberships.
- `CompanyMember` links an account to a company. The MVP role is `ADMIN`; the schema can add `TEAM_MEMBER` later.
- A membership is unique by `(account_id, company_id)`. Ownership is always derived from the authenticated account.
- The HTTP session stores a membership-validated `activeCompanyId`. Producer signup and login with one membership select it automatically; a dedicated API switches it.
- Producer requests never accept a company ID as an ownership authority in the request body.

## Layer and module boundaries

The repository convention is authoritative: top-level `application`, `domain`, `presentation`, and `infrastructure` packages are used.

- `domain`: framework-free entities, value objects and policies.
- `application`: use cases, transaction boundaries and repository output ports.
- `presentation`: documented `/api/v1` HTTP contracts only.
- `infrastructure`: JPA entities, Spring Data repositories, adapters and seed input.

Domain objects and JPA entities are separate. Flyway is the schema source of truth and Hibernate only validates it.

## Draft boundary

- Draft and submitted Application are separate aggregates.
- A Draft may be anonymous or account-owned, but no anonymous Draft controller or public API is introduced in this slice.
- Anonymous identification, access proof, legal notice, file upload and conflict APIs remain blocked pending an explicit contract.
- The persistence model and application service support account attachment after verified authentication.
- For the same `(account, posting)`, the newer whole Draft replaces the older whole Draft using server revision and UTC client modification time.
- Drafts are never queried through producer/application-review repositories.

## Application and immutable evidence

- One authenticated applicant may submit at most one Application per Posting.
- Selected roles and answers are normalized for constraints and querying.
- The exact submitted application, posting, role and consent evidence is also stored in immutable MySQL JSON snapshots.
- Submission creates Application, roles, answers, application snapshot and consent snapshots and marks the Draft submitted in one application transaction.
- No normal update port is exposed for submitted applications or snapshots.

## Time and identifiers

- Internal API/domain identifiers are MySQL `BIGINT` and JSON numbers.
- Source string identifiers from the supplied mock file are preserved in nullable unique `source_id` columns.
- Instants are stored as UTC in `DATETIME(6)` columns without implicit database time-zone conversion.
- API timestamps use ISO-8601 with an explicit offset.
- Date-only seed periods mean `[start date 00:00, day after end date 00:00)` in Asia/Seoul and are converted to UTC.

## Seed/import

- Import is an explicit development command/profile, never an unconditional startup action.
- The entire file is parsed and validated before a transaction starts.
- Upserts use stable source identifiers and are idempotent.
- Schema migration and seed data remain separate.
- Source image URLs are stored as URLs and are never downloaded.
- Passwords are not read from the seed file; a development bootstrap secret is supplied through the environment and BCrypt-hashed before storage.
- Records that cannot satisfy the accepted domain contract are rejected with structured diagnostics rather than filled with invented values.
- The supplied legacy applications, careers, photos, reviews and round closures are excluded because the applications lack mandatory residence, consent evidence and authenticated Applicant ownership.

## Deferred decisions

- Anonymous Draft API path, verifier and cookie/token contract.
- Anonymous Draft privacy notice/legal basis and retention period.
- Draft/file upload ownership, cleanup and cross-device conflict contract.
- Submission idempotency key and public submission API.
