export type OtrAudition = {
  readonly id: string;
  readonly otrId: string;
  readonly title: string;
  readonly otrLink: string;
  readonly applicationPath: string;
  readonly roles: readonly string[];
  readonly deadline: string;
  readonly createdAt: string;
};

export type CreateOtrAudition = {
  readonly otrId: string;
  readonly title: string;
  readonly roles: readonly string[];
  readonly deadline: string;
};

export type PublicOtrAudition = Pick<OtrAudition, "id" | "otrId" | "title" | "roles" | "deadline"> & {
  readonly producerName: string;
  readonly postingSnapshotVersion: string;
  readonly open: boolean;
};

export const otrAuditionRoutes = {
  list: "/producers/otr-auditions",
  create: "/producers/otr-auditions?create=1",
  selected: (id: string) => `/producers/otr-auditions/${encodeURIComponent(id)}`,
  apply: (id: string) => `/apply/standard/${encodeURIComponent(id)}`,
} as const;

export function otrAuditionLink(otrId: string) {
  return `https://otr.co.kr/audition/?vid=${encodeURIComponent(otrId)}`;
}
