"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollVideo.module.css";

type Props = {
  src: string;
  /** Pixels of scroll spent on the hero exit animation. */
  heroExtent?: number;
  /** Pixels of scroll per second of video during scrub. */
  playbackConst?: number;
  /** Lerp factor 0–1. Lower = smoother / floatier. */
  ease?: number;
};

export default function ScrollVideo({
  src,
  heroExtent = 800,
  playbackConst = 600,
  ease = 0.085,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const heroContentRef = useRef<HTMLDivElement | null>(null);
  const videoLayerRef = useRef<HTMLDivElement | null>(null);
  const videoFxRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const hero = heroRef.current;
    const heroContent = heroContentRef.current;
    const videoLayer = videoLayerRef.current;
    const videoFx = videoFxRef.current;
    const video = videoRef.current;
    if (!wrapper || !hero || !heroContent || !videoLayer || !videoFx || !video)
      return;

    let duration = 0;
    let smoothed = 0;
    let raf = 0;
    let ready = false;
    let seeking = false;
    let heroPx = heroExtent;
    let scrubPx = 0;

    const setupExtent = () => {
      const vh = window.innerHeight;
      heroPx = heroExtent;
      scrubPx = duration * playbackConst;
      wrapper.style.height = `${heroPx + scrubPx + vh}px`;
    };

    const onMeta = () => {
      duration = video.duration || 0;
      if (!isFinite(duration) || duration <= 0) return;
      setupExtent();
    };
    const onCanPlay = () => {
      ready = true;
    };
    const onSeeked = () => {
      seeking = false;
    };

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const tick = () => {
      const rect = wrapper.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const scrolledPx = -rect.top;
      const raw =
        travel > 0 ? Math.min(1, Math.max(0, scrolledPx / travel)) : 0;

      smoothed += (raw - smoothed) * ease;
      if (Math.abs(raw - smoothed) < 0.0004) smoothed = raw;

      const total = heroPx + scrubPx;
      const heroNorm = total > 0 ? heroPx / total : 0;
      const heroProg = heroNorm > 0 ? Math.min(1, smoothed / heroNorm) : 1;
      const scrubProg =
        heroNorm < 1
          ? Math.max(0, Math.min(1, (smoothed - heroNorm) / (1 - heroNorm)))
          : 0;

      const t = easeInOutCubic(heroProg);

      // HERO: slides LEFT, with tilt
      hero.style.transform = `translate3d(${-t * 110}%, 0, 0)`;
      hero.style.opacity = `${Math.max(0, 1 - t * 1.05)}`;
      const tilt = t * -3;
      const innerShift = t * -8;
      heroContent.style.transform = `translate3d(${innerShift}rem, 0, 0) rotate(${tilt}deg)`;

      // VIDEO LAYER: gentle reveal
      const reveal = easeOutCubic(heroProg);
      videoLayer.style.opacity = `${reveal}`;
      videoLayer.style.transform = `translate3d(${(1 - reveal) * 4}rem, 0, 0)`;

      // VIDEO FX (inner): scrub-driven slow cinematic zoom + tiny rotation drift
      // CSS handles breathing/floating on the parent layer for constant liveness
      const zoom = 1 + scrubProg * 0.08;
      const drift = Math.sin(performance.now() / 2400) * 1.2; // slight px drift
      const rot = Math.sin(performance.now() / 4000) * 0.4; // ±0.4°
      videoFx.style.transform = `scale(${zoom}) translate3d(0, ${drift}px, 0) rotate(${rot}deg)`;

      // SCRUB
      if (ready && duration > 0) {
        const target = scrubProg * duration;
        if (!seeking && Math.abs(video.currentTime - target) > 1 / 60) {
          seeking = true;
          try {
            video.currentTime = target;
          } catch {
            seeking = false;
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    if (video.readyState >= 1 && video.duration && isFinite(video.duration)) {
      onMeta();
    } else {
      video.addEventListener("loadedmetadata", onMeta, { once: true });
    }
    if (video.readyState >= 3) {
      onCanPlay();
    } else {
      video.addEventListener("canplaythrough", onCanPlay, { once: true });
      video.addEventListener("canplay", onCanPlay, { once: true });
    }
    video.addEventListener("seeked", onSeeked);
    window.addEventListener("resize", setupExtent);

    try {
      video.load();
    } catch {}
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setupExtent);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("canplaythrough", onCanPlay);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [playbackConst, ease, heroExtent, src]);

  return (
    <section ref={wrapperRef} className={styles.wrapper}>
      <svg className={styles.svgDefs} aria-hidden>
        <defs>
          <filter
            id="pencil-rough"
            x="-2%"
            y="-2%"
            width="104%"
            height="104%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.045"
              numOctaves="2"
              seed="3"
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" />
          </filter>
          <filter
            id="pencil-rough-soft"
            x="-2%"
            y="-2%"
            width="104%"
            height="104%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.07"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" />
          </filter>
        </defs>
      </svg>

      <div className={styles.sticky}>
        <div className={styles.paper} aria-hidden />

        <div ref={videoLayerRef} className={styles.videoLayer}>
          {/* CSS keyframe-driven breathing + drift on this wrapper */}
          <div className={styles.videoBreath}>
            {/* JS-driven cinematic scrub zoom on this inner wrapper */}
            <div ref={videoFxRef} className={styles.videoFx}>
              <video
                ref={videoRef}
                className={styles.video}
                src={src}
                muted
                playsInline
                preload="auto"
                disablePictureInPicture
                disableRemotePlayback
                tabIndex={-1}
                aria-hidden
              />
              <div className={styles.videoVignette} aria-hidden />
              <div className={styles.videoGlow} aria-hidden />
              <div className={styles.videoGrain} aria-hidden />
            </div>
          </div>
        </div>

        <div ref={heroRef} className={styles.heroLayer}>
          <div ref={heroContentRef} className={styles.heroContent}>
            <p className={styles.kicker}>
              <span className={styles.kickerLine} />
              Chapter One — drawn from imagination
              <span className={styles.kickerLine} />
            </p>

            <h1 className={styles.title}>
              <span className={styles.titleLine1}>This is the</span>
              <span className={styles.titleLine2}>story</span>
              <span className={styles.titleLine3}>
                of a <em className={styles.titleAccent}>Boy.</em>
              </span>
            </h1>

            <p className={styles.subtitle}>
              one small soul. one quiet afternoon. one big world.
            </p>

            <p className={styles.description}>
              In a place sketched by a child&apos;s hand — between the colors of
              crayon and the silence of paper — the smallest character finds the
              biggest adventure of his life. This is where it begins.
            </p>

            <div className={styles.ctaRow}>
              <button className={styles.ctaPrimary} type="button">
                <span>Begin the Story</span>
                <span className={styles.ctaArrow}>→</span>
              </button>
              <button className={styles.ctaSecondary} type="button">
                Watch the Journey
              </button>
            </div>

            <div className={styles.scrollHint} aria-hidden>
              <span className={styles.scrollMark}>~</span>
              <span>scroll to begin</span>
              <span className={styles.scrollArrow}>↓</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
