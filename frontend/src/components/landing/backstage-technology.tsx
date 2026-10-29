import { technicalStories } from "./technical-stories";
import styles from "./backstage-technology.module.css";

type Story = (typeof technicalStories)[number];
const visibleStories = ["discovery", "reservation", "pdf"];

function StoryFlow({ story }: { story: Story }) {
  return <ol className={styles.flow} aria-label={`${story.label} 처리 흐름`}>{story.flow.map((step) => <li key={step}>{step}</li>)}</ol>;
}

function StoryDetails({ story }: { story: Story }) {
  return <div className={styles.details}><span className={styles.status}>{story.status}</span><dl className={styles.explanation}><dt>문제</dt><dd>{story.problem}</dd><dt>해결</dt><dd>{story.solution}</dd></dl><StoryFlow story={story} /><p className={styles.measurement}><strong>{story.metric}</strong><span>{story.unit}</span></p><p>{story.result}</p><p>{story.detail}</p><p className={styles.limit}>{story.limit}</p><div className={styles.sources}>{story.links.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" aria-label={`${link.label} 새 창`}>{link.label}</a>)}</div></div>;
}

function TechnicalStory({ story }: { story: Story }) {
  return <article className={styles.story} aria-labelledby={`engineering-${story.id}`}>
    <span className={styles.label}>{story.audience}</span>{story.id === "pdf" && <span className={styles.preparing}>준비 중</span>}
    <h3 id={`engineering-${story.id}`}>{story.title}</h3><p className={styles.value}>{story.value}</p>
    <details className={styles.evidence}><summary>어떻게 만들었나요<span aria-hidden="true">＋</span></summary><StoryDetails story={story} /></details>
  </article>;
}

export function BackstageTechnology() {
  const primaryStories = visibleStories.flatMap((id) => technicalStories.filter((story) => story.id === id));
  const operationStories = technicalStories.filter((story) => !visibleStories.includes(story.id));
  return <section id="backstage" className={styles.backstage} aria-labelledby="engineering-title">
    <header className={styles.heading} data-reveal><h2 id="engineering-title">당신은 다음 무대에<br /><em>집중할 수 있도록</em></h2></header>
    <div className={styles.stories}>{primaryStories.map((story) => <TechnicalStory key={story.id} story={story} />)}</div>
    <details className={styles.operations}><summary>서비스를 지키는 기술<span aria-hidden="true">＋</span></summary><div className={styles.operationStories}>{operationStories.map((story) => <TechnicalStory key={story.id} story={story} />)}</div></details>
  </section>;
}
