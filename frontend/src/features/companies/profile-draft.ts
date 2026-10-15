import type { VenueAddress } from "@/features/auditions/creation-types";

/**
 * 공연사 정보 입력 화면의 상태와 변환. 운영자 편집과 공개 화면의 수정 요청이 같은 규칙을 쓴다.
 * 선택 항목은 값을 적거나 "비공개"를 체크해야 한다. 비공개로 체크한 항목은 빈 값으로 저장되고 공개 화면에 "비공개"로 보인다.
 */

/** 요청자가 바꾼 항목. 백엔드 `CompanyField`와 같다. 대표자 이름은 공개 동의, 주소는 상세 주소 공개까지 함께 묶는다. */
export type CompanyField =
  | "NAME"
  | "REPRESENTATIVE_NAME"
  | "LINKS"
  | "FOUNDED_ON"
  | "ADDRESS"
  | "REGION"
  | "PHONE"
  | "DESCRIPTION"
  | "HISTORY";

/** "비공개"로 체크할 수 있는 선택 항목. */
export type PrivateField = Exclude<CompanyField, "NAME">;

export const PRIVATE_FIELDS: readonly PrivateField[] = [
  "REPRESENTATIVE_NAME", "FOUNDED_ON", "PHONE", "REGION", "LINKS", "ADDRESS", "DESCRIPTION", "HISTORY",
];

export const COMPANY_FIELD_LABELS: Readonly<Record<CompanyField, string>> = {
  NAME: "공연사 이름",
  REPRESENTATIVE_NAME: "대표자 이름",
  LINKS: "링크",
  FOUNDED_ON: "설립일",
  ADDRESS: "공연사 주소",
  REGION: "지역",
  PHONE: "대표 연락처",
  DESCRIPTION: "소개",
  HISTORY: "연혁",
};

export const EMPTY_ADDRESS: VenueAddress = { roadAddress: "", detailAddress: "", zonecode: "", latitude: null, longitude: null };

/** 공연사 정보 값. 운영자 공연사(`AdminCompany`)와 수정 요청 값이 이 모양을 따른다. 비운 항목은 null이다. */
export type CompanyProfileValues = {
  readonly name: string;
  readonly representativeName: string | null;
  readonly representativeNamePublic: boolean;
  readonly links: readonly string[];
  readonly foundedOn: string | null;
  readonly address: VenueAddress | null;
  readonly addressPublic: boolean;
  readonly region: string | null;
  readonly phone: string | null;
  readonly description: string | null;
  readonly history: string | null;
  readonly sourceNote?: string | null;
};

export type CompanyDraft = {
  readonly name: string;
  readonly representativeName: string;
  readonly representativeNamePublic: boolean;
  readonly links: readonly string[];
  readonly foundedOn: string;
  readonly address: VenueAddress;
  readonly addressPublic: boolean;
  readonly region: string;
  readonly phone: string;
  readonly description: string;
  readonly history: string;
  readonly sourceNote: string;
  /** "비공개"로 체크한 항목. */
  readonly hidden: Readonly<Record<PrivateField, boolean>>;
};

/** 서버로 보내는 공연사 정보 본문. 백엔드 `WriteCompanyRequest`와 같다. 비운 항목은 지운다. */
export type CompanyWrite = {
  readonly name: string;
  readonly representativeName: string;
  readonly representativeNamePublic: boolean;
  /** 최대 3개. */
  readonly links: readonly string[];
  readonly foundedOn: string | null;
  readonly address: VenueAddress | null;
  readonly addressPublic: boolean;
  readonly region: string;
  readonly phone: string;
  readonly description: string;
  readonly history: string;
  readonly sourceNote: string;
};

const NOTHING_HIDDEN: Readonly<Record<PrivateField, boolean>> = {
  REPRESENTATIVE_NAME: false, FOUNDED_ON: false, PHONE: false, REGION: false, LINKS: false, ADDRESS: false,
  DESCRIPTION: false, HISTORY: false,
};

/** 새로 쓸 때. 선택 항목마다 값을 적거나 비공개를 체크해야 저장된다. */
export function emptyDraft(name = ""): CompanyDraft {
  return {
    name, representativeName: "", representativeNamePublic: false, links: [""], foundedOn: "", address: EMPTY_ADDRESS,
    addressPublic: false, region: "", phone: "", description: "", history: "", sourceNote: "", hidden: NOTHING_HIDDEN,
  };
}

/** 저장된 정보로 시작한다. 비어 있는 항목은 비공개로 체크해 둔다. */
export function draftOf(values: CompanyProfileValues): CompanyDraft {
  const filled = filledFields(values);
  return {
    name: values.name,
    representativeName: values.representativeName ?? "",
    representativeNamePublic: values.representativeNamePublic,
    links: values.links.length ? values.links : [""],
    foundedOn: values.foundedOn ?? "",
    address: values.address ?? EMPTY_ADDRESS,
    addressPublic: values.addressPublic,
    region: values.region ?? "",
    phone: values.phone ?? "",
    description: values.description ?? "",
    history: values.history ?? "",
    sourceNote: values.sourceNote ?? "",
    hidden: Object.fromEntries(PRIVATE_FIELDS.map((field) => [field, !filled.has(field)])) as Record<PrivateField, boolean>,
  };
}

/** 비공개로 체크한 항목은 비우고, 빈 링크 칸은 뺀다. */
export function writeOf(draft: CompanyDraft): CompanyWrite {
  const shown = (field: PrivateField, value: string) => draft.hidden[field] ? "" : value.trim();
  const addressShown = !draft.hidden.ADDRESS && draft.address.roadAddress.trim() !== "";
  return {
    name: draft.name.trim(),
    representativeName: shown("REPRESENTATIVE_NAME", draft.representativeName),
    representativeNamePublic: !draft.hidden.REPRESENTATIVE_NAME && draft.representativeNamePublic,
    links: draft.hidden.LINKS ? [] : draft.links.map((link) => link.trim()).filter(Boolean),
    foundedOn: shown("FOUNDED_ON", draft.foundedOn) || null,
    address: addressShown ? draft.address : null,
    addressPublic: addressShown && draft.addressPublic,
    region: shown("REGION", draft.region),
    phone: shown("PHONE", draft.phone),
    description: shown("DESCRIPTION", draft.description),
    history: shown("HISTORY", draft.history),
    sourceNote: draft.sourceNote.trim(),
  };
}

/** 값도 적지 않고 비공개도 체크하지 않은 항목. 하나라도 있으면 저장하지 않는다. */
export function undecidedFields(draft: CompanyDraft): readonly PrivateField[] {
  const filled = filledFields(writeValues(writeOf(draft)));
  return PRIVATE_FIELDS.filter((field) => !draft.hidden[field] && !filled.has(field));
}

/** 아직 정하지 않은 항목을 모두 비공개로 체크한다. */
export function hideUndecided(draft: CompanyDraft): CompanyDraft {
  const undecided = new Set(undecidedFields(draft));
  return {
    ...draft,
    hidden: Object.fromEntries(
      PRIVATE_FIELDS.map((field) => [field, draft.hidden[field] || undecided.has(field)]),
    ) as Record<PrivateField, boolean>,
  };
}

/** 처음 보여 준 정보와 비교해 요청자가 바꾼 항목을 찾는다. */
export function changedFields(initial: CompanyDraft, draft: CompanyDraft): readonly CompanyField[] {
  const before = writeOf(initial);
  const after = writeOf(draft);
  return (Object.keys(COMPANY_FIELD_LABELS) as CompanyField[])
    .filter((field) => fieldKey(before, field) !== fieldKey(after, field));
}

/**
 * 수정 요청을 지금 정보 위에 얹는다. 요청자는 공개되지 않은 값을 볼 수 없으므로 바꾼 항목만 요청 값으로 덮어쓴다.
 * 정보 출처 메모는 지금 메모를 그대로 둔다.
 */
export function mergeRequest(
  current: CompanyProfileValues,
  proposal: CompanyProfileValues,
  changed: readonly CompanyField[],
): CompanyDraft {
  const merged: Partial<Record<keyof CompanyProfileValues, unknown>> = { ...current };
  for (const field of changed) {
    for (const key of FIELD_KEYS[field]) merged[key] = proposal[key];
  }
  return draftOf(merged as CompanyProfileValues);
}

/** 화면에 보일 항목 값. 비어 있으면 null이다. */
export function describeField(values: CompanyProfileValues, field: CompanyField): string | null {
  switch (field) {
    case "NAME": return values.name;
    case "REPRESENTATIVE_NAME":
      return values.representativeName
        ? `${values.representativeName} (${values.representativeNamePublic ? "공개 동의" : "공개 안 함"})`
        : null;
    case "LINKS": return values.links.length ? values.links.join("\n") : null;
    case "FOUNDED_ON": return values.foundedOn;
    case "ADDRESS":
      return values.address
        ? `${[values.address.roadAddress, values.address.detailAddress].filter(Boolean).join(" ")} (${values.addressPublic ? "상세 주소 공개" : "시·군·구까지만 공개"})`
        : null;
    case "REGION": return values.region;
    case "PHONE": return values.phone;
    case "DESCRIPTION": return values.description;
    case "HISTORY": return values.history;
  }
}

const FIELD_KEYS: Readonly<Record<CompanyField, readonly (keyof CompanyProfileValues)[]>> = {
  NAME: ["name"],
  REPRESENTATIVE_NAME: ["representativeName", "representativeNamePublic"],
  LINKS: ["links"],
  FOUNDED_ON: ["foundedOn"],
  ADDRESS: ["address", "addressPublic"],
  REGION: ["region"],
  PHONE: ["phone"],
  DESCRIPTION: ["description"],
  HISTORY: ["history"],
};

function writeValues(write: CompanyWrite): CompanyProfileValues {
  return {
    ...write,
    representativeName: write.representativeName || null,
    region: write.region || null,
    phone: write.phone || null,
    description: write.description || null,
    history: write.history || null,
  };
}

function filledFields(values: CompanyProfileValues): ReadonlySet<PrivateField> {
  return new Set(PRIVATE_FIELDS.filter((field) => describeField(values, field) !== null));
}

/** 주소는 지도가 좌표를 채워도 바뀐 것으로 치지 않는다. */
function fieldKey(write: CompanyWrite, field: CompanyField): string {
  const values = writeValues(write);
  return JSON.stringify(FIELD_KEYS[field].map((key) => {
    const value = values[key] ?? null;
    if (key !== "address" || !values.address) return value;
    const { roadAddress, detailAddress, zonecode } = values.address;
    return { roadAddress, detailAddress: detailAddress.trim(), zonecode };
  }));
}
