export type PerformanceCategory = "PLAY" | "MUSICAL";

export type PerformanceVisibility = "DISPLAYED" | "HIDDEN";

export type RoleGender = "MALE" | "FEMALE" | "ANY";

export type PerformanceRole = {
  id: string;
  name: string;
  description: string;
  gender: RoleGender;
  birthYearMin: number | null;
  birthYearMax: number | null;
  heightMin: number | null;
  heightMax: number | null;
  weightMin: number | null;
  weightMax: number | null;
  mbti: string | null;
  qualification: string | null;
};

export type LatestRecruitment = {
  id: string;
  title: string;
  status: "OPEN" | "CLOSED" | "SCHEDULED";
  closesAt: string;
} | null;

export type PerformanceStatistics = {
  totalRecruitmentCount: number;
  openRecruitmentCount: number;
  totalApplicantCount: number;
};

export type Performance = {
  id: string;
  producerId: string;
  title: string;
  description: string;
  category: PerformanceCategory;
  thumbnailUrl: string;
  visibility: PerformanceVisibility;
  roles: PerformanceRole[];
  statistics: PerformanceStatistics;
  latestRecruitment: LatestRecruitment;
  updatedAt: string;
};

export type PerformanceSummary = Pick<
  Performance,
  | "id"
  | "producerId"
  | "title"
  | "description"
  | "category"
  | "thumbnailUrl"
  | "visibility"
  | "statistics"
  | "latestRecruitment"
  | "updatedAt"
> & {
  roleCount: number;
};

export type PerformanceListResponse = {
  performances: PerformanceSummary[];
  totalCount: number;
};

export type PerformanceFilters = {
  query?: string;
  category?: PerformanceCategory | "ALL";
  recruiting?: boolean;
};

export type SavePerformanceRequest = Pick<
  Performance,
  "title" | "description" | "category" | "thumbnailUrl" | "roles"
>;

export type ThumbnailUploadRequest = {
  fileName: string;
  dataUrl: string;
};

export type ThumbnailUploadResponse = {
  thumbnailUrl: string;
};
