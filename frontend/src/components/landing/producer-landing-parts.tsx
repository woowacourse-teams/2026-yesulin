import Image from "next/image";
import type { ReactNode } from "react";
import type { SampleApplicant } from "./producer-landing-content";
import styles from "./producer-landing.module.css";

export function ApplicantFace({ applicant }: { applicant: SampleApplicant }) {
  if (applicant.photo) {
    return <Image className={styles.face} src={applicant.photo} alt="" width={68} height={68} />;
  }
  return <span className={styles.face} style={{ background: applicant.color }}>{applicant.name.slice(0, 1)}</span>;
}

type ApplicantRowProps = { applicant: SampleApplicant; detail: string; children: ReactNode };

export function ApplicantRow({ applicant, detail, children }: ApplicantRowProps) {
  return <div className={styles.row}>
    <ApplicantFace applicant={applicant} />
    <span className={styles.who}><b>{applicant.name}</b><small>{detail}</small></span>
    {children}
  </div>;
}

type PillTone = "new" | "pass" | "wait" | "soon";

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>;
}
