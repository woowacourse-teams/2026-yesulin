"use client";

import Image from "next/image";
import { useState } from "react";
import { landingPosters } from "./landing-posters";
import styles from "./producer-landing.module.css";

const wallPosters = landingPosters.slice(0, 12);

export function ProducerPosterWall() {
  const [paused, setPaused] = useState(false);
  return <div className={styles.wallArea}>
    <div className={styles.wall} data-paused={paused}>
      <ul className={styles.track}>
        {wallPosters.map((poster) => <li key={poster.id}><Image src={poster.image} alt={poster.caption} width={300} height={400} sizes="150px" /></li>)}
        {wallPosters.map((poster) => <li key={`again-${poster.id}`} aria-hidden="true"><Image src={poster.image} alt="" width={300} height={400} sizes="150px" /></li>)}
      </ul>
    </div>
    <button type="button" className={styles.wallToggle} aria-pressed={paused} onClick={() => setPaused(!paused)}>포스터 움직임 멈추기</button>
  </div>;
}
