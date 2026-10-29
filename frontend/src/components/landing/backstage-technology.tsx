import { technicalStories } from "./technical-stories";
import styles from "./backstage-technology.module.css";

type Story = (typeof technicalStories)[number];

function StoryFlow({ story }: { story: Story }) {
  return <ol className={styles.flow} aria-label={`${story.label} 처리 흐름`}>{story.flow.map((step) => <li key={step}>{step}</li>)}</ol>;
}

function StoryEvidence({ story }: { story: Story }) {
  return <details className={styles.evidence}><summary>문제와 해결 과정 살펴보기<span aria-hidden="true">＋</span></summary><dl className={styles.explanation}><dt>어떤 문제였나요</dt><dd>{story.problem}</dd><dt>어떻게 풀었나요</dt><dd>{story.solution}</dd></dl><StoryFlow story={story} /><p>{story.detail}</p><p className={styles.limit}>{story.limit}</p><div className={styles.sources}>{story.links.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" aria-label={`${link.label} 새 창`}>{link.label}</a>)}</div></details>;
}

function TechnicalStory({ story }: { story: Story }) {
  return <article className={styles.story} aria-labelledby={`engineering-${story.id}`} data-reveal>
    <div className={styles.value}><span>{story.audience}</span><h3 id={`engineering-${story.id}`}>{story.title}</h3><p>{story.value}</p></div>
    <div className={styles.content}><div className={styles.caption}><span>{story.label}</span><span>{story.status}</span></div><p className={styles.measurement}><strong>{story.metric}</strong><span>{story.unit}</span></p><p className={styles.result}>{story.result}</p><StoryEvidence story={story} /></div>
  </article>;
}

export function BackstageTechnology() {
  return <section id="backstage" className={styles.backstage} aria-labelledby="engineering-title">
    <header className={styles.heading} data-reveal><span>이 경험을 받치는 기술</span><h2 id="engineering-title">무대 앞의 경험을 위해<br /><em>무대 뒤에서 풀어낸 문제들</em></h2></header>
    <div className={styles.stories}>{technicalStories.map((story) => <TechnicalStory key={story.id} story={story} />)}</div>
    <a className={styles.archive} href="https://sprint.yesulin.art/index.html" target="_blank" rel="noreferrer" aria-label="예술in 스프린트 전체 기록 새 창">스프린트 전체 기록 보기</a>
  </section>;
}
