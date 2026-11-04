import styles from "./category-shortcuts.module.css";

/** 관절마다 따로 움직이는 퍼포먼스 댄서. 선 두께와 끝 처리는 Phosphor 아이콘과 같다. */
export function Dancer() {
  return <svg className={styles.dancer} viewBox="0 0 256 256" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <g className={styles.dAll}>
      <g className={`${styles.dLeg} ${styles.dLegL}`}><line x1="128" y1="148" x2="106" y2="190" /><g className={styles.dShinL}><line x1="106" y1="190" x2="102" y2="234" /></g></g>
      <g className={`${styles.dLeg} ${styles.dLegR}`}><line x1="128" y1="148" x2="150" y2="190" /><g className={styles.dShinR}><line x1="150" y1="190" x2="154" y2="234" /></g></g>
      <g className={styles.dTorso}>
        <line x1="128" y1="80" x2="128" y2="148" />
        <circle className={styles.dHead} cx="128" cy="46" r="20" />
        <g className={`${styles.dArm} ${styles.dArmL}`}><line x1="128" y1="94" x2="94" y2="118" /><g className={styles.dForeL}><line x1="94" y1="118" x2="72" y2="92" /></g></g>
        <g className={`${styles.dArm} ${styles.dArmR}`}><line x1="128" y1="94" x2="162" y2="118" /><g className={styles.dForeR}><line x1="162" y1="118" x2="184" y2="92" /></g></g>
      </g>
    </g>
  </svg>;
}
