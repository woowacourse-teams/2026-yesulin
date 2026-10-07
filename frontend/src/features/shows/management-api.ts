import {
  closeShow,
  createShow,
  createShowSession,
  deleteShow,
  deleteShowSession,
  getProducerShow,
  openShow,
  updateShow,
  updateShowSession,
  uploadShowImage,
} from "./producer-api";
import { showRoutes, type ProducerShow, type SaveShow, type SaveShowSession } from "./types";

/**
 * 기획사 관리 화면과 운영자 공연 관리 화면이 같은 공연 폼·상세 화면을 쓰도록 API만 바꿔 끼운다.
 * 운영자 공연은 외부 링크로만 예매받고 주최 이름과 외부 예매 링크를 직접 입력한다.
 */
export type ShowManagementApi = {
  readonly kind: "producer" | "admin";
  readonly listHref: string;
  readonly listLabel: string;
  readonly detailHref: (showId: string) => string;
  readonly getShow: (showId: string) => Promise<ProducerShow>;
  readonly createShow: (input: SaveShow) => Promise<ProducerShow>;
  readonly updateShow: (showId: string, input: SaveShow) => Promise<ProducerShow>;
  readonly deleteShow: (showId: string) => Promise<void>;
  readonly openShow: (showId: string) => Promise<ProducerShow>;
  readonly closeShow: (showId: string) => Promise<ProducerShow>;
  readonly createSession: (showId: string, input: SaveShowSession) => Promise<ProducerShow>;
  readonly updateSession: (showId: string, sessionId: number, input: SaveShowSession) => Promise<ProducerShow>;
  readonly deleteSession: (showId: string, sessionId: number) => Promise<ProducerShow>;
  readonly uploadImage: (image: File) => Promise<number>;
};

export const producerShowManagementApi: ShowManagementApi = {
  kind: "producer",
  listHref: showRoutes.manageList,
  listLabel: "무료 공연 목록",
  detailHref: showRoutes.manageDetail,
  getShow: getProducerShow,
  createShow,
  updateShow,
  deleteShow,
  openShow,
  closeShow,
  createSession: createShowSession,
  updateSession: updateShowSession,
  deleteSession: deleteShowSession,
  uploadImage: uploadShowImage,
};
