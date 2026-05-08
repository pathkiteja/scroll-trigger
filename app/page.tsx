import ScrollVideo from "@/components/ScrollVideo";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <ScrollVideo
        src="/video/hero.mp4"
        heroExtent={800}
        playbackConst={600}
        ease={0.085}
      />
    </main>
  );
}
