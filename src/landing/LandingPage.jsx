import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, CirclePlay, Clock3, ListChecks, Menu, ShieldCheck, Sprout, TrendingUp, X } from 'lucide-react';
import './landing.css';

const baseUrl = import.meta.env.BASE_URL;
const appUrl = `${baseUrl}app`;
const registerUrl = `${appUrl}?mode=register`;
const mediaUrl = `${baseUrl}landing/media/`;

function Brand({ onClick }) {
  return <a className="lp-brand" href="#home" onClick={onClick} aria-label="Habit Tracker home"><span className="lp-brand-mark"><Sprout size={23} strokeWidth={1.7} aria-hidden="true" /></span><span>Habit Tracker</span></a>;
}

function ProductImage({ file, alt, className = '', eager = false }) {
  return <figure className={`lp-product-image ${className}`}>
    <a href={`${mediaUrl}${file}`} target="_blank" rel="noreferrer" aria-label={`Open full-size illustration: ${alt}`}>
      <img src={`${mediaUrl}${file}`} alt={alt} width="1280" height="720" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} />
      <span className="lp-image-open"><ArrowUpRight size={16} aria-hidden="true" /> View full size</span>
    </a>
    <figcaption>Interface illustration · example habit, no account data</figcaption>
  </figure>;
}

const questions = [
  { question: 'Why do I need an account?', answer: 'Your habits and check-ins belong to your signed-in account. Create an account or log in to start tracking. This public page does not load your habits, calculate your streaks, or know your activity history.' },
  { question: 'What counts as an active day?', answer: 'A day becomes active when you complete at least one habit. The activity calendar shows deeper green when you complete more habits. Days with no check-ins stay neutral.' },
  { question: 'Can I choose which days a habit repeats?', answer: 'Yes. Choose the weekdays for each habit when you create it, and edit the schedule when your routine changes. The app distinguishes habits that are due today from those that are not scheduled.' },
  { question: 'Do I have to use the AI features?', answer: 'No. Daily tracking, activity, statistics, and history-based insights work with AI switched off. You can choose whether to enable three-day missed-habit risk estimates in Settings.' },
  { question: 'Does the walkthrough show my account?', answer: 'No. The video is an animated interface walkthrough using one example reading habit. The images are illustrations, not screenshots of a personal account. Your real progress appears only inside the app after you sign in.' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  const closeMenu = () => setMenuOpen(false);

  return <div className="landing-page">
    <a className="lp-skip-link" href="#landing-main">Skip to content</a>
    <header className="lp-header">
      <div className="lp-container lp-header-inner">
        <Brand onClick={closeMenu} />
        <nav className="lp-main-nav" aria-label="Main navigation"><a href="#the-product">The product</a><a href="#product-tour">Watch the tour</a><a href="#how-it-works">How it works</a></nav>
        <div className="lp-header-actions"><a className="lp-login-link" href={appUrl}>Log in</a><a className="lp-button lp-button-primary" href={appUrl}>Get started <ArrowRight size={16} aria-hidden="true" /></a></div>
        <button ref={menuButton} type="button" className="lp-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="lp-mobile-nav" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</button>
      </div>
      <nav id="lp-mobile-nav" className="lp-mobile-nav lp-container" aria-label="Mobile navigation" hidden={!menuOpen}><a href="#the-product" onClick={closeMenu}>The product</a><a href="#product-tour" onClick={closeMenu}>Watch the tour</a><a href="#how-it-works" onClick={closeMenu}>How it works</a><a href={appUrl} onClick={closeMenu}>Get started <ArrowRight size={16} aria-hidden="true" /></a></nav>
    </header>

    <main id="landing-main">
      <section id="home" className="lp-hero lp-container" aria-labelledby="lp-hero-title">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow"><span /> A clearer way to build a routine</p>
          <h1 id="lp-hero-title">Good intentions.<br /><span>A daily practice.</span></h1>
          <p className="lp-hero-description">A personal habit tracker for the things you want to keep doing. Plan your routines, check in when they’re done, and understand your progress over time.</p>
          <div className="lp-hero-actions"><a className="lp-button lp-button-primary" href={appUrl}>Get started <ArrowRight size={18} aria-hidden="true" /></a><a className="lp-text-link" href="#product-tour"><CirclePlay size={20} strokeWidth={1.7} aria-hidden="true" /> Watch the walkthrough</a></div>
          <p className="lp-hero-note"><ShieldCheck size={15} aria-hidden="true" /> Your personal progress starts after you sign in.</p>
        </div>
        <ProductImage file="plan-routine.svg" alt="Illustrated habit setup with an example reading routine and a weekday schedule" eager className="lp-hero-image" />
      </section>

      <section id="the-product" className="lp-introduction lp-container" aria-labelledby="lp-intro-title">
        <div><p className="lp-section-index">Meet Habit Tracker</p><h2 id="lp-intro-title">A useful record of<br />what you actually do.</h2></div>
        <div className="lp-intro-copy"><p>It’s easy to make a list of habits. The harder part is finding a routine you can return to. Habit Tracker brings the plan, the daily check-in, and the longer view into one workspace.</p><p>Start with something specific. Choose the days that fit your life. As you check in, your own history becomes a picture of what’s working and where to adjust.</p><div className="lp-product-principles"><span><CalendarDays size={18} aria-hidden="true" /> Plan with intention</span><span><Check size={18} aria-hidden="true" /> Record your effort</span><span><TrendingUp size={18} aria-hidden="true" /> Learn from your history</span></div></div>
      </section>

      <section id="product-tour" className="lp-tour" aria-labelledby="lp-tour-title">
        <div className="lp-container">
          <div className="lp-tour-heading"><div><p className="lp-section-index">Take a closer look</p><h2 id="lp-tour-title">From a new habit<br />to a daily check-in.</h2></div><div><p>See how choosing a schedule, recording a check-in, and reading your activity fit together.</p><span className="lp-video-label"><Clock3 size={15} aria-hidden="true" /> 24-second animated product walkthrough</span></div></div>
          <div className="lp-video-frame"><video controls preload="none" playsInline poster={`${mediaUrl}product-walkthrough-poster.png`} width="1280" height="720" aria-label="Habit Tracker animated product walkthrough" aria-describedby="lp-video-description"><source src={`${mediaUrl}product-walkthrough.mp4`} type="video/mp4" /><track kind="captions" src={`${mediaUrl}product-walkthrough.en.vtt`} srcLang="en" label="English" default />Your browser does not support embedded video. <a href={`${mediaUrl}product-walkthrough.mp4`}>Download the walkthrough</a>.</video></div>
          <p id="lp-video-description" className="lp-media-disclosure">An illustrated walkthrough, not a recording of a personal account. It uses one example habit and no account history.</p>
          <details className="lp-transcript"><summary>Read the walkthrough transcript</summary><ol><li><strong>Choose your routine.</strong> Add an example reading habit and select the weekdays.</li><li><strong>Check in.</strong> Mark the example habit complete after doing it. Real check-ins are saved to your signed-in account.</li><li><strong>Read a day.</strong> A day with a check-in gains colour. A day without one stays neutral.</li><li><strong>Build your own history.</strong> Your activity, active days, streaks, and insights come from your own saved check-ins.</li></ol></details>
        </div>
      </section>

      <section id="how-it-works" className="lp-features lp-container" aria-labelledby="lp-features-title">
        <div className="lp-features-heading"><p className="lp-section-index">Built around the everyday</p><h2 id="lp-features-title">The plan. The practice.<br />The bigger picture.</h2><p>Each part of the app has a clear job, so you can focus on the routine itself.</p></div>
        <article className="lp-feature-row"><ProductImage file="plan-routine.svg" alt="Illustration of choosing a habit name and repeat days" /><div className="lp-feature-copy"><span className="lp-feature-icon"><CalendarDays size={24} strokeWidth={1.6} aria-hidden="true" /></span><p className="lp-section-index">01 / Make a plan</p><h3>A routine that fits<br />your real week.</h3><p>Decide what you want to do and when you want to do it. Your schedule gives each habit a place, without asking every day to look the same.</p><ul><li>Choose the weekdays for each habit.</li><li>Add a description to keep the action specific.</li><li>Set an optional reminder for the habit.</li></ul></div></article>
        <article className="lp-feature-row lp-feature-reverse"><ProductImage file="daily-check-in.svg" alt="Illustration of marking an example reading habit complete" /><div className="lp-feature-copy"><span className="lp-feature-icon"><ListChecks size={24} strokeWidth={1.6} aria-hidden="true" /></span><p className="lp-section-index">02 / Show up</p><h3>A clear place for<br />today’s small actions.</h3><p>Your daily workspace keeps your routines and completion state in view. Mark a habit complete when you’ve done it, then get on with your day.</p><ul><li>See which habits are scheduled today.</li><li>Check in or correct an accidental check-in.</li><li>Browse longer habit lists without losing your place.</li></ul></div></article>
        <article className="lp-feature-row"><ProductImage file="activity-history.svg" alt="Illustration explaining a neutral day and a day with a check-in" /><div className="lp-feature-copy"><span className="lp-feature-icon"><TrendingUp size={24} strokeWidth={1.6} aria-hidden="true" /></span><p className="lp-section-index">03 / Understand your progress</p><h3>See the pattern<br />behind the practice.</h3><p>The activity calendar and reports are built from your saved check-ins. They become useful as your real history grows.</p><dl><div><dt>Active days</dt><dd>Days when you completed at least one habit.</dd></div><div><dt>Streaks</dt><dd>Your current and longest runs of active days.</dd></div><div><dt>Completion & insights</dt><dd>How consistently you complete planned habits, and how your routines change over time.</dd></div></dl></div></article>
      </section>

      <section className="lp-ai-note lp-container" aria-labelledby="lp-ai-title"><div className="lp-ai-icon"><ShieldCheck size={27} strokeWidth={1.5} aria-hidden="true" /></div><div><p className="lp-section-index">Optional perspective</p><h2 id="lp-ai-title">A little extra guidance. Your choice.</h2><p>Enable AI predictions in Settings for estimates of the risk of missing a habit over the next three days. Tracking, activity, and history-based reports remain available with AI off.</p></div><span className="lp-choice-label">You control it in Settings</span></section>

      <section id="questions" className="lp-faq lp-container" aria-labelledby="lp-faq-title"><div><p className="lp-section-index">Before you begin</p><h2 id="lp-faq-title">A few things<br />you might wonder.</h2></div><div className="lp-faq-list">{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>

      <section className="lp-start lp-container" aria-labelledby="lp-start-title"><Sprout size={40} strokeWidth={1.4} aria-hidden="true" /><div><p className="lp-section-index">Your next step</p><h2 id="lp-start-title">Start with one habit.<br />Make the progress yours.</h2><p>Your account starts with your own routines and check-ins. Choose something small enough to begin today.</p></div><div className="lp-start-actions"><a className="lp-button lp-button-primary" href={appUrl}>Get started <ArrowRight size={17} aria-hidden="true" /></a><a className="lp-text-link" href={registerUrl}>Create an account <ArrowUpRight size={15} aria-hidden="true" /></a></div></section>
    </main>
    <footer className="lp-footer lp-container"><div><Brand /><p>A place for your daily practice.</p></div><nav aria-label="Footer navigation"><a href="#the-product">The product</a><a href="#product-tour">Walkthrough</a><a href="#questions">Questions</a><a href={appUrl}>Open the app <ArrowUpRight size={14} aria-hidden="true" /></a></nav><span>© {new Date().getFullYear()} Habit Tracker</span></footer>
  </div>;
}
