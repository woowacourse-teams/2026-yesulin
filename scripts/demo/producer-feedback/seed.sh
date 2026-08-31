#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
RESET_SQL="$SCRIPT_DIR/reset.sql"
SEED_SQL="$SCRIPT_DIR/seed.sql"
VERIFY_SQL="$SCRIPT_DIR/verify.sql"
ASSET_DIR="$SCRIPT_DIR/assets"
APPLICANT_ASSET_DIR="${DEMO_APPLICANT_ASSET_DIR:-$ASSET_DIR/applicants}"
S3_BUCKET="${YESULIN_STORAGE_S3_BUCKET:-yesulin-local}"
S3_KEY_PREFIX="${YESULIN_STORAGE_S3_KEY_PREFIX:-yesulin}"
DEMO_S3_PREFIX="demo/producer-feedback"

cd "$REPOSITORY_ROOT"

fail() {
  echo "[실패] $*" >&2
  exit 1
}

info() {
  echo "[데모 시드] $*"
}

require_local_compose() {
  local compose_name
  compose_name="$(docker compose config | sed -n 's/^name: //p' | head -n 1)"
  [[ "$compose_name" == "yesulin-local" ]] || fail "yesulin-local Compose에서만 실행할 수 있습니다. 현재: ${compose_name:-unknown}"

  docker compose ps --services --status running | grep -qx mysql \
    || fail "로컬 MySQL이 실행 중이 아닙니다. docker compose up -d --build --wait를 먼저 실행하세요."
  docker compose ps --services --status running | grep -qx localstack \
    || fail "로컬 LocalStack이 실행 중이 아닙니다. docker compose up -d --build --wait를 먼저 실행하세요."

  local database_name
  database_name="$(docker compose exec -T mysql sh -c 'printf "%s" "$MYSQL_DATABASE"')"
  [[ "$database_name" == "yesulin" ]] || fail "로컬 yesulin DB에서만 실행할 수 있습니다. 현재: ${database_name:-unknown}"
}

mysql_run() {
  docker compose exec -T mysql sh -c \
    'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --default-character-set=utf8mb4 \
      --protocol=TCP -h127.0.0.1 -u"$MYSQL_USER" "$MYSQL_DATABASE"'
}

mysql_file() {
  mysql_run < "$1"
}

localstack_run() {
  docker compose exec -T localstack awslocal "$@"
}

ensure_bucket() {
  if ! localstack_run s3api head-bucket --bucket "$S3_BUCKET" >/dev/null 2>&1; then
    localstack_run s3 mb "s3://$S3_BUCKET" >/dev/null
  fi
}

content_type_of() {
  case "${1##*.}" in
    jpg|JPG|jpeg|JPEG) echo "image/jpeg" ;;
    png|PNG) echo "image/png" ;;
    webp|WEBP) echo "image/webp" ;;
    *) fail "지원하지 않는 이미지 형식입니다: $1 (jpg, jpeg, png, webp만 가능)" ;;
  esac
}

file_size_of() {
  if stat -f '%z' "$1" >/dev/null 2>&1; then
    stat -f '%z' "$1"
  else
    stat -c '%s' "$1"
  fi
}

upload_from_stdin() {
  local source=$1
  local target_key=$2
  local content_type=$3
  localstack_run s3 cp - "s3://$S3_BUCKET/$target_key" \
    --content-type "$content_type" --only-show-errors < "$source"
}

reset_s3() {
  localstack_run s3 rm "s3://$S3_BUCKET/$S3_KEY_PREFIX/public/$DEMO_S3_PREFIX" --recursive --only-show-errors >/dev/null 2>&1 || true
  localstack_run s3 rm "s3://$S3_BUCKET/$S3_KEY_PREFIX/$DEMO_S3_PREFIX" --recursive --only-show-errors >/dev/null 2>&1 || true
  localstack_run s3 rm "s3://$S3_BUCKET/$S3_KEY_PREFIX/private/actor-photos/$DEMO_S3_PREFIX" --recursive --only-show-errors >/dev/null 2>&1 || true
}

reset_demo() {
  info "기존 데모 데이터 삭제"
  mysql_file "$RESET_SQL"
  ensure_bucket
  reset_s3
  info "데모 데이터 삭제 완료"
}

find_poster() {
  local candidate
  for candidate in "$ASSET_DIR"/poster.jpg "$ASSET_DIR"/poster.jpeg "$ASSET_DIR"/poster.png "$ASSET_DIR"/poster.webp; do
    if [[ -f "$candidate" ]]; then
      echo "$candidate"
      return
    fi
  done
  echo "$REPOSITORY_ROOT/frontend/public/images/performances/moonlight.jpg"
}

upload_poster() {
  local source base extension content_type size logical_key physical_key public_key
  source="$(find_poster)"
  [[ -f "$source" ]] || fail "데모 포스터 파일을 찾을 수 없습니다."
  base="$(basename "$source")"
  extension="${base##*.}"
  extension="$(printf '%s' "$extension" | tr '[:upper:]' '[:lower:]')"
  content_type="$(content_type_of "$source")"
  size="$(file_size_of "$source")"
  logical_key="public/$DEMO_S3_PREFIX/poster.$extension"
  physical_key="$S3_KEY_PREFIX/$logical_key"
  public_key="$S3_KEY_PREFIX/$DEMO_S3_PREFIX/poster.$extension"

  upload_from_stdin "$source" "$physical_key" "$content_type"
  # 현재 로컬 공개 URL은 object_key의 public/ 접두사를 제거하므로 공개 경로에도 같은 객체를 둔다.
  upload_from_stdin "$source" "$public_key" "$content_type"

  mysql_run <<SQL
update file_assets
set object_key = '$logical_key',
    original_filename = 'poster.$extension',
    content_type = '$content_type',
    size = $size,
    status = 'READY'
where id = 980000;
SQL
  info "포스터 업로드 완료: $base"
}

photo_slot() {
  case "$1" in
    profile) echo 1 ;;
    full) echo 2 ;;
    acting) echo 3 ;;
    *) fail "알 수 없는 사진 종류입니다: $1" ;;
  esac
}

photo_label() {
  case "$1" in
    profile) echo "프로필 사진" ;;
    full) echo "전신 사진" ;;
    acting) echo "연기 사진" ;;
    *) fail "알 수 없는 사진 종류입니다: $1" ;;
  esac
}

upload_applicant_photos() {
  local count=0 metadata_count=0 file base stem extension number kind slot numeric_number file_id submission_id applicant_id
  local content_type size logical_key physical_key label gender age duplicate_suffix naming_mode=""
  shopt -s nullglob
  local files=("$APPLICANT_ASSET_DIR"/*)
  shopt -u nullglob

  if [[ ${#files[@]} -eq 0 ]]; then
    info "지원자 사진이 없어 연결을 건너뜁니다. assets/applicants에 사진을 추가한 뒤 다시 실행할 수 있습니다."
    return
  fi

  for file in "${files[@]}"; do
    [[ -f "$file" ]] || continue
    base="$(basename "$file")"
    extension="${base##*.}"
    stem="${base%.*}"

    if [[ "$stem" =~ ^(man|woman)_([0-9]{1,3})(_([0-9]+))?$ ]]; then
      [[ "$naming_mode" != "numbered" ]] || fail "번호형 사진과 성별·나이형 사진을 함께 사용할 수 없습니다."
      naming_mode="metadata"
      metadata_count=$((metadata_count + 1))
      (( metadata_count <= 200 )) || fail "지원자 사진은 최대 200장까지 연결할 수 있습니다."

      number="$(printf '%03d' "$metadata_count")"
      numeric_number=$metadata_count
      kind="profile"
      age="${BASH_REMATCH[2]}"
      duplicate_suffix="${BASH_REMATCH[4]:-1}"
      (( age >= 18 && age <= 100 )) || fail "사진 파일의 나이는 18~100이어야 합니다: $base"
      (( duplicate_suffix >= 1 )) || fail "사진 파일의 구분 번호는 1 이상이어야 합니다: $base"
      if [[ "${BASH_REMATCH[1]}" == "man" ]]; then
        gender="MALE"
      else
        gender="FEMALE"
      fi
    elif [[ "$stem" =~ ^([0-9]{3})-(profile|full|acting)$ ]]; then
      [[ "$naming_mode" != "metadata" ]] || fail "번호형 사진과 성별·나이형 사진을 함께 사용할 수 없습니다."
      naming_mode="numbered"
      number="${BASH_REMATCH[1]}"
      kind="${BASH_REMATCH[2]}"
      numeric_number=$((10#$number))
      (( numeric_number >= 1 && numeric_number <= 200 )) || fail "지원자 번호는 001~200이어야 합니다: $base"
      gender=""
      age=""
    else
      info "파일명 규칙과 달라 건너뜀: $base"
      continue
    fi

    slot="$(photo_slot "$kind")"
    label="$(photo_label "$kind")"
    file_id=$((990000 + numeric_number * 10 + slot))
    submission_id=$((981000 + numeric_number))
    applicant_id=$submission_id
    content_type="$(content_type_of "$file")"
    size="$(file_size_of "$file")"
    extension="$(printf '%s' "$extension" | tr '[:upper:]' '[:lower:]')"
    logical_key="private/actor-photos/$DEMO_S3_PREFIX/${number}-${kind}.${extension}"
    physical_key="$S3_KEY_PREFIX/$logical_key"

    upload_from_stdin "$file" "$physical_key" "$content_type"
    mysql_run <<SQL
update submissions
set gender = coalesce(nullif('$gender', ''), gender),
    age_at_recruitment_deadline = coalesce(nullif('$age', ''), age_at_recruitment_deadline),
    birth_date = case
        when nullif('$age', '') is null then birth_date
        else date_sub('2026-09-30', interval cast('$age' as unsigned) year)
    end,
    military_service_status = case
        when '$gender' = 'FEMALE' then 'NOT_APPLICABLE'
        when '$gender' = 'MALE' then 'COMPLETED'
        else military_service_status
    end
where id = $submission_id;

insert into file_assets
    (id, object_key, owner_id, original_filename, content_type, file_type, size, status)
values
    ($file_id, '$logical_key', $applicant_id, '$base', '$content_type', 'IMAGE', $size, 'READY')
on duplicate key update
    object_key = values(object_key),
    owner_id = values(owner_id),
    original_filename = values(original_filename),
    content_type = values(content_type),
    file_type = values(file_type),
    size = values(size),
    status = values(status);

insert into file_references (file_id, reference_type, reference_id)
values ($file_id, 'SUBMISSION_PHOTO', $submission_id)
on duplicate key update file_id = values(file_id);

insert into submission_photo_requirement_answers
    (submission_id, answer_order, photo_requirement_id, requirement_description, file_id)
values
    ($submission_id, $((slot - 1)), 980001, '$label', $file_id)
on duplicate key update
    photo_requirement_id = values(photo_requirement_id),
    requirement_description = values(requirement_description),
    file_id = values(file_id);
SQL
    count=$((count + 1))
    if [[ "$naming_mode" == "metadata" ]]; then
      info "사진 연결: $base -> ${number}번 지원자 (${gender}, ${age}세)"
    fi
  done
  info "지원자 사진 ${count}개 업로드 및 연결 완료"
}

seed_demo() {
  local producer_count
  producer_count="$(printf 'select count(*) from members where id = 9001 and type = '\''PRODUCER'\'' and status = '\''ACTIVE'\'';\n' | mysql_run | tail -n 1 | tr -d '[:space:]')"
  [[ "$producer_count" == "1" ]] || fail "로컬 제작사 계정(id=9001)이 없습니다. 백엔드가 Flyway 로컬 시드를 완료했는지 확인하세요."

  reset_demo
  info "공연·공고·지원자 200명 생성"
  mysql_file "$SEED_SQL"
  ensure_bucket
  upload_poster
  upload_applicant_photos
  info "데모 데이터 생성 완료"
  mysql_file "$VERIFY_SQL"
}

verify_demo() {
  info "데모 데이터 검증"
  mysql_file "$VERIFY_SQL"
}

require_local_compose

case "${1:-seed}" in
  seed) seed_demo ;;
  reset) reset_demo ;;
  verify) verify_demo ;;
  *) fail "사용법: $0 [seed|reset|verify]" ;;
esac
