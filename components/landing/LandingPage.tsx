'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Mic,
  Brain,
  ShieldCheck,
  Lock,
  CheckCircle2,
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  Zap,
  TrendingUp,
  ChevronDown,
  Star,
  PlayCircle,
  Activity,
  Sparkles,
  Volume2,
  FileText,
  Quote,
} from 'lucide-react'

// ---------- Hero analysis mockup ----------
function LiveCallMockup() {
  const [activeTag, setActiveTag] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActiveTag((p) => (p + 1) % 4), 1800)
    return () => clearInterval(t)
  }, [])

  const annotations = [
    { tag: 'פתיחה חזקה', score: 9.2, color: 'bg-brand-secondary text-white' },
    { tag: 'התנגדות מחיר', score: 6.5, color: 'bg-brand-warning text-white' },
    { tag: 'הקשבה פעילה', score: 8.8, color: 'bg-brand-secondary text-white' },
    { tag: 'סגירה רכה', score: 7.4, color: 'bg-brand-primary text-white' },
  ]

  return (
    <div className="relative">
      {/* Floating decorative shapes */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-brand-secondary-light leaf-shape opacity-60 -z-10" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-brand-info-light leaf-shape-alt opacity-60 -z-10" />

      <div className="relative bg-white leaf-shape-lg shadow-2xl border border-neutral-200/80 overflow-hidden">
        {/* Browser-like top bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-300" />
            <div className="w-3 h-3 rounded-full bg-yellow-300" />
            <div className="w-3 h-3 rounded-full bg-green-300" />
          </div>
          <div className="flex-1 text-center text-xs text-neutral-500 font-mono">
            coachee.co.il/calls/47291
          </div>
        </div>

        {/* Waveform */}
        <div className="px-6 pt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-brand-primary-gradient leaf-shape-sm flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900">שיחה #47291 • Outbound</div>
              <div className="text-xs text-neutral-500">7:42 דק׳ • היום 14:23</div>
            </div>
            <div className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-secondary-light text-brand-secondary-dark text-xs font-bold rounded-full">
              <Activity className="w-3 h-3 animate-pulse" />
              ניתוח חי
            </div>
          </div>
          <div className="flex items-end gap-[2px] h-12 px-2">
            {Array.from({ length: 60 }).map((_, i) => {
              const h = 20 + Math.sin(i * 0.6) * 30 + Math.cos(i * 0.3) * 20
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-gradient-to-t from-brand-primary to-brand-secondary opacity-80"
                  style={{ height: `${Math.max(8, Math.abs(h))}%` }}
                />
              )
            })}
          </div>
        </div>

        {/* Transcript with annotations */}
        <div className="px-6 py-5 space-y-3">
          {[
            { speaker: 'נציג', text: 'שלום שרה, מדבר אבי מ-Coachee. יש לך 2 דקות?', tag: 0 },
            { speaker: 'לקוחה', text: 'עכשיו זה לא הזמן הכי טוב, אנחנו בעיצומה של רבעון.', tag: 1 },
            { speaker: 'נציג', text: 'אני שומע, וזה בדיוק הזמן שבו צוותי מכירות צריכים את העזרה הזו.', tag: 2 },
          ].map((line, idx) => (
            <div key={idx} className="flex gap-3">
              <span
                className={`text-xs font-bold pt-0.5 w-12 ${
                  line.speaker === 'נציג' ? 'text-brand-primary' : 'text-neutral-500'
                }`}
              >
                {line.speaker}:
              </span>
              <p
                className={`text-sm leading-relaxed flex-1 transition-all ${
                  activeTag === line.tag
                    ? 'text-neutral-900 bg-yellow-50 px-2 -mx-2 rounded'
                    : 'text-neutral-600'
                }`}
              >
                {line.text}
              </p>
            </div>
          ))}
        </div>

        {/* Score grid */}
        <div className="grid grid-cols-4 border-t border-neutral-200">
          {annotations.map((a, idx) => (
            <div
              key={a.tag}
              className={`px-3 py-4 text-center border-l border-neutral-200 last:border-l-0 transition-all ${
                activeTag === idx ? 'bg-brand-info-light/40 scale-[1.02]' : ''
              }`}
            >
              <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1 ${a.color}`}>
                {a.tag}
              </div>
              <div className="text-xl font-bold font-display text-neutral-900">
                {a.score}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-4 -right-4 bg-white shadow-xl border border-neutral-200 leaf-shape-sm px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-secondary-gradient leaf-shape-sm flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-brand-secondary-dark" />
        </div>
        <div>
          <div className="text-xs text-neutral-500">דוח מלא תוך</div>
          <div className="text-base font-bold text-neutral-900">94 שניות</div>
        </div>
      </div>
    </div>
  )
}

// ---------- Marquee ----------
function Marquee() {
  const items = [
    'מכירות Outbound',
    'Follow-up לפני הצעה',
    'Follow-up אחרי הצעה',
    'תיאום פגישות',
    'Follow-up אחרי פגישה',
    'שירות לקוחות',
  ]
  const stream = [...items, ...items, ...items]
  return (
    <div className="relative overflow-hidden bg-brand-primary py-5">
      <div className="flex gap-12 animate-marquee whitespace-nowrap">
        {stream.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 text-white/90 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary-light" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- AI streams ----------
function AIPipelineVisual() {
  const streams = [
    {
      icon: FileText,
      title: 'תמלול',
      model: 'gpt-4o-mini-transcribe',
      desc: 'הופך אודיו לטקסט בעברית, תוך זיהוי דובר',
      color: 'from-brand-primary to-brand-primary-light',
      bg: 'bg-brand-info-light',
    },
    {
      icon: Volume2,
      title: 'ניתוח טון',
      model: 'gpt-audio-1.5',
      desc: 'מזהה רגש, מתח, ביטחון, ואנרגיה — מהאודיו הגולמי',
      color: 'from-brand-secondary to-brand-secondary-light',
      bg: 'bg-brand-secondary-light',
    },
    {
      icon: Brain,
      title: 'ניתוח תוכן',
      model: 'gpt-5.4-mini',
      desc: 'בוחן 32-35 פרמטרים עסקיים: התנגדויות, סגירה, ערך',
      color: 'from-brand-primary-light to-brand-secondary',
      bg: 'bg-brand-info-light',
    },
  ]
  return (
    <div className="relative">
      {/* Source */}
      <div className="flex justify-center mb-12">
        <div className="bg-neutral-900 text-white leaf-shape px-6 py-4 inline-flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 bg-white/10 leaf-shape-sm flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-white/60">קלט</div>
            <div className="font-bold">קובץ הקלטה</div>
          </div>
        </div>
      </div>

      {/* Three parallel streams */}
      <div className="grid md:grid-cols-3 gap-6 relative">
        {/* Connection lines */}
        <div className="hidden md:block absolute -top-6 left-1/2 -translate-x-1/2 w-px h-6 bg-neutral-300" />

        {streams.map((s, idx) => (
          <div key={s.title} className="relative">
            <div className="hidden md:block absolute -top-6 left-1/2 -translate-x-1/2 w-px h-6 bg-neutral-300" />
            <div
              className={`coachee-card-leaf p-6 h-full ${
                idx === 1 ? 'leaf-shape-alt md:translate-y-4' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 leaf-shape-sm bg-gradient-to-br ${s.color} flex items-center justify-center`}
                >
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-[10px] font-mono text-neutral-400 px-2 py-1 bg-neutral-100 rounded">
                  {s.model}
                </div>
              </div>
              <h3 className="text-xl font-bold font-display text-neutral-900 mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Output */}
      <div className="flex justify-center mt-12">
        <div className="bg-gradient-to-br from-brand-primary via-brand-primary-light to-brand-primary-dark text-white leaf-shape px-6 py-4 inline-flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 bg-white/10 leaf-shape-sm flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-white/60">פלט</div>
            <div className="font-bold">דוח מלא + ציונים</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- FAQ accordion ----------
function FAQItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white leaf-shape-sm border border-neutral-200/80 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-right gap-4 p-5 hover:bg-neutral-50 transition-colors"
      >
        <span className="text-base font-semibold text-neutral-900">{q}</span>
        <ChevronDown
          className={`h-5 w-5 text-brand-primary transition-transform flex-shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-neutral-600 leading-relaxed text-sm border-t border-neutral-100 pt-4">
          {a}
        </div>
      )}
    </div>
  )
}

// ---------- DATA ----------
const SETUP_FEE = 2000

const PACKAGES = [
  {
    id: 'professional',
    name: 'מקצועי',
    pricePerAgent: 249,
    minAgents: 5,
    callMinutes: 150,
    highlight: false,
    tagline: 'מושלם לצוותים מתחילים את המסע',
    features: [
      'כל 6 סוגי השיחות',
      'דוחות סטנדרטיים + ציונים אובייקטיביים',
      'הצפנה מתקדמת (AES-256 + Envelope)',
      'תמיכה באימייל (24-48 שעות)',
      'דאשבורד מנהלים בסיסי',
    ],
    extras: [],
  },
  {
    id: 'business',
    name: 'עסקי',
    pricePerAgent: 499,
    minAgents: 5,
    callMinutes: 499,
    highlight: true,
    tagline: 'הצעת הערך הטובה ביותר — 3.3× יותר דקות',
    features: [
      'כל 6 הסוגים + תרחישים מותאמים אישית',
      'דוחות מתקדמים + תובנות צוות AI',
      'הצפנה מתקדמת (AES-256 + Envelope)',
      'תמיכה בעדיפות + ערוץ Slack ייעודי',
      'דאשבורד מנהלים מתקדם + השוואות',
    ],
    extras: ['גישת API מלאה', 'Onboarding מלא + check-in רבעוני'],
  },
] as const

const FAQ = [
  {
    q: 'איך זה שונה מתוכנות הקלטה רגילות?',
    a: 'אנחנו לא מחליפים את ההקלטה — אנחנו מנתחים אותה. בעוד שתוכנות אחרות שומרות את ההקלטה, Coachee מבינה מה נאמר, איך זה נאמר (טון, רגש), ונותנת לך דוח עסקי מעשי לשיפור.',
  },
  {
    q: 'מה כוללת עלות ההקמה (2,000 ₪)?',
    a: 'תשלום חד-פעמי שכולל הגדרת חשבון מלא, הוספת כל הנציגים, התאמת פרמטרים לארגון שלכם, והדרכה ראשונית. אינטגרציה עם CRM או מערכות חיצוניות מתומחרת בנפרד לפי דרישה.',
  },
  {
    q: 'באיזו שפה השיחות?',
    a: 'המערכת מכוונת לעברית מלאה — כל פרומפט, ניתוח, דוח וממשק נכתבו בעברית עסקית מקצועית. תומכת גם באנגלית.',
  },
  {
    q: 'האם הנתונים שלנו מאובטחים?',
    a: 'כן. כל ההקלטות והניתוחים מוצפנים בהצפנת AES-256 עם מפתחות ייחודיים לכל קובץ (Envelope Encryption). הגישה מבוקרת ברמת מסד הנתונים (RLS), כך שכל לקוח רואה רק את הנתונים שלו.',
  },
  {
    q: 'מה קורה אם חרגנו מכמות הדקות?',
    a: 'תקבלו התראה ב-80% מהמכסה. אפשר לרכוש דקות נוספות בכל עת, או לשדרג לחבילה גדולה יותר. אין חסימה אוטומטית — אנחנו תמיד פותחים מולכם דיון.',
  },
  {
    q: 'האם ניתן לבטל?',
    a: 'כן, ניתן לבטל בכל חודש בודד. אין התחייבות שנתית — רק עלות ההקמה היא חד-פעמית.',
  },
  {
    q: 'כמה זמן לוקח להטמיע במשרד?',
    a: 'במקצועי — תוך יום עבודה. בעסקי אנו עוזרים בהטמעה מלאה תוך 1-2 שבועות, כולל הדרכה לצוות.',
  },
  {
    q: 'באיזו תדירות מקבלים תובנות?',
    a: 'כל שיחה שמועלית מנותחת תוך דקות. הדאשבורד מתעדכן בזמן אמת, ויש דוחות שבועיים וחודשיים אוטומטיים.',
  },
  {
    q: 'האם מתאים גם למוקדי שירות?',
    a: 'בהחלט. אחד מ-6 סוגי השיחות הוא שירות לקוחות, עם פרמטרים מותאמים: סבלנות, פתרון בעיות, אמפתיה, וזמן טיפול.',
  },
] as const

// ---------- MAIN ----------
export default function LandingPage() {
  return (
    <div className="bg-brand-bg text-neutral-900">
      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/logo.png"
              alt="Coachee"
              width={140}
              height={48}
              className="object-contain h-12 w-auto"
              priority
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <a href="#how" className="hover:text-brand-primary transition-colors">איך זה עובד</a>
            <a href="#features" className="hover:text-brand-primary transition-colors">תכונות</a>
            <a href="#pricing" className="hover:text-brand-primary transition-colors">חבילות</a>
            <a href="#security" className="hover:text-brand-primary transition-colors">אבטחה</a>
            <a href="#faq" className="hover:text-brand-primary transition-colors">שאלות נפוצות</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">התחברות</Button>
            </Link>
            <a href="#pricing">
              <Button size="sm">התחל עכשיו</Button>
            </a>
          </div>
        </div>
      </header>

      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Background mesh */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-secondary/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(circle, #472DA6 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Text */}
            <div className="lg:col-span-6 text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200 text-brand-primary rounded-full text-xs font-medium shadow-sm mb-6">
                <span className="w-2 h-2 rounded-full bg-brand-secondary animate-pulse" />
                מאות שיחות נותחו השבוע
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display tracking-tight leading-[1.05]">
                כל שיחה היא{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-brand-gradient">מכרה זהב.</span>
                  <span className="absolute inset-x-0 bottom-1 h-3 bg-brand-secondary-light/70 -z-0" />
                </span>
                <br />
                אנחנו{' '}
                <span className="italic font-display">מוצאים</span> אותו עבורך.
              </h1>

              <p className="mt-6 text-xl text-neutral-600 leading-relaxed max-w-xl">
                Coachee מנתחת את שיחות הצוות בעברית עם שלושה מנועי AI במקביל,
                מספקת לכל נציג דוח שיפור אישי עם 32+ פרמטרים, ומאפשרת
                למנהלים לראות בדיוק איך נשמע הצוות שלהם — מאובטח, מהיר, ומדיד.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a href="#pricing" className="group">
                  <Button size="lg" className="text-base h-14 px-8 w-full sm:w-auto">
                    התחל לנתח שיחות
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  </Button>
                </a>
                <a href="#how">
                  <Button variant="outline" size="lg" className="text-base h-14 px-8 w-full sm:w-auto">
                    <PlayCircle className="w-4 h-4 ml-2" />
                    ראה איך זה עובד
                  </Button>
                </a>
              </div>

              {/* Mini trust row */}
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-neutral-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-secondary" />
                  ללא דמי התקנה
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-secondary" />
                  ביטול גמיש
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-secondary" />
                  הצפנה ברמה צבאית
                </div>
              </div>
            </div>

            {/* Mockup */}
            <div className="lg:col-span-6">
              <LiveCallMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ========== MARQUEE ========== */}
      <Marquee />

      {/* ========== THE PROBLEM ========== */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        <div className="absolute top-12 right-12 w-32 h-32 bg-brand-info-light leaf-shape opacity-50 -z-10" />
        <div className="absolute bottom-12 left-12 w-40 h-40 bg-brand-secondary-light leaf-shape-alt opacity-50 -z-10" />

        <div className="max-w-5xl mx-auto">
          <div className="flex justify-center mb-8">
            <Quote className="w-12 h-12 text-brand-primary opacity-30" />
          </div>
          <p className="text-center text-3xl sm:text-4xl lg:text-5xl font-display font-medium leading-tight text-neutral-900">
            צוות המכירות שלך עורך{' '}
            <span className="text-brand-gradient font-bold">מאות שיחות בשבוע.</span>
            <br />
            <span className="text-neutral-500">כמה מהן באמת נבחנות?</span>
          </p>

          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              {
                stat: '92%',
                title: 'נשכחות',
                desc: 'מתחת ל-10% מהשיחות נשמעות שוב על ידי מנהל. תובנות נעלמות.',
              },
              {
                stat: '6h',
                title: 'בשבוע',
                desc: 'מנהל בכיר משקיע על האזנה ידנית — זמן יקר שלא מתורגם להדרכה.',
              },
              {
                stat: '0',
                title: 'אחידות',
                desc: 'בלי קריטריונים אובייקטיביים, כל מנהל מעריך אחרת. הצוות מבולבל.',
              },
            ].map((p, idx) => (
              <div
                key={p.title}
                className={`coachee-card-leaf p-6 ${idx % 2 === 1 ? 'leaf-shape-alt' : ''}`}
              >
                <div className="text-5xl font-bold font-display text-brand-primary">
                  {p.stat}
                </div>
                <div className="mt-2 text-lg font-semibold text-neutral-900">
                  {p.title}
                </div>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== AI PIPELINE ========== */}
      <section id="how" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-brand-bg">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white text-brand-primary rounded-full text-sm font-medium border border-neutral-200 mb-4">
              <Brain className="w-4 h-4" />
              ארכיטקטורת ה-AI
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight">
              שלושה מנועים.
              <br />
              <span className="text-brand-gradient">ניתוח אחד מקיף.</span>
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
              הקובץ נשלח במקביל לשלוש מערכות AI מומחות. כל אחת חוקרת זווית
              שונה. התוצאה — דוח עסקי שלא מפספס כלום.
            </p>
          </div>

          <AIPipelineVisual />
        </div>
      </section>

      {/* ========== BENTO FEATURES ========== */}
      <section id="features" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-16 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-secondary-light text-brand-secondary-dark rounded-full text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                מה תקבלו
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight max-w-2xl">
                כלים שמשנים את האופן שבו{' '}
                <span className="text-brand-gradient">צוותים מתפתחים.</span>
              </h2>
            </div>
            <a href="#pricing" className="hidden lg:block">
              <Button variant="outline">לתמחור</Button>
            </a>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-fr gap-5">
            {/* BIG: Live transcript */}
            <div className="md:col-span-4 md:row-span-2 bg-gradient-to-br from-brand-primary via-brand-primary-light to-brand-primary-dark text-white leaf-shape-lg p-8 lg:p-10 relative overflow-hidden">
              <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/10 leaf-shape-alt" />
              <div className="absolute -top-8 -left-8 w-40 h-40 bg-brand-secondary/20 leaf-shape" />

              <div className="relative">
                <div className="w-14 h-14 bg-white/15 leaf-shape-sm flex items-center justify-center mb-6 backdrop-blur">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold font-display mb-4 leading-tight">
                  תמלול חי + ניתוח עברית מלאה
                </h3>
                <p className="text-white/90 text-lg leading-relaxed max-w-xl mb-8">
                  זיהוי דובר אוטומטי, סימון מילות מפתח, סימון התנגדויות וסגירות —
                  הכול מתוייג ומוצג בצורה ויזואלית להבנה מהירה.
                </p>

                {/* Mock transcript bubbles */}
                <div className="space-y-2 max-w-md">
                  <div className="bg-white/15 backdrop-blur leaf-shape-sm px-4 py-3 text-sm">
                    <span className="font-bold">נציג:</span> מה הרגיש לך לא נכון בהצעה?
                  </div>
                  <div className="bg-white/15 backdrop-blur leaf-shape-sm px-4 py-3 text-sm leaf-shape-alt">
                    <span className="font-bold">לקוח:</span> המחיר. אנחנו עובדים עם XYZ ב-30% פחות.
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-secondary text-white text-xs font-bold rounded">
                    <Activity className="w-3 h-3" />
                    זוהתה התנגדות מחיר
                  </div>
                </div>
              </div>
            </div>

            {/* 6 call types */}
            <div className="md:col-span-2 bg-brand-secondary-light leaf-shape-lg leaf-shape-alt p-7 relative overflow-hidden">
              <div className="text-7xl font-bold font-display text-brand-secondary-dark leading-none">
                6
              </div>
              <div className="mt-2 text-xl font-bold text-neutral-900">סוגי שיחות</div>
              <p className="mt-2 text-sm text-neutral-700 leading-relaxed">
                מ-Outbound ועד שירות לקוחות. כל סוג מקבל פרמטרים ייעודיים.
              </p>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-brand-secondary/10 leaf-shape" />
            </div>

            {/* 32 parameters */}
            <div className="md:col-span-2 bg-neutral-900 text-white leaf-shape-lg p-7 relative overflow-hidden">
              <div className="text-7xl font-bold font-display leading-none">
                32+
              </div>
              <div className="mt-2 text-xl font-bold">פרמטרים</div>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                בכל ניתוח. ציונים אובייקטיביים שמאפשרים השוואה.
              </p>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-brand-primary/30 leaf-shape" />
            </div>

            {/* Hebrew-first */}
            <div className="md:col-span-3 bg-white border border-neutral-200/80 leaf-shape-lg p-7">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-info-light leaf-shape-sm flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-neutral-900 mb-2">
                    מותאם לעברית מהיסוד
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    כל פרומפט, כל ניתוח וכל דוח — נכתבו בעברית עסקית מקצועית.
                    לא תרגום, לא פאצ׳ים. הבנה אמיתית של ניואנסים בשיחה.
                  </p>
                </div>
              </div>
            </div>

            {/* Team insights */}
            <div className="md:col-span-3 bg-brand-info-light leaf-shape-lg leaf-shape-alt p-7">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white leaf-shape-sm flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-neutral-900 mb-2">
                    תובנות צוות וניהול
                  </h3>
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    דאשבורד למנהלים: השוואת ביצועים, מעקב התקדמות לאורך זמן,
                    זיהוי דפוסים חוזרים בכל הצוות, ודוחות אוטומטיים.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-brand-bg relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white text-brand-primary rounded-full text-sm font-medium border border-neutral-200 mb-4">
              4 צעדים — תוך דקות
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight">
              פשוט עד כאב.
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                num: '01',
                title: 'מעלים הקלטה',
                desc: 'גוררים קובץ MP3, WAV, M4A — כל פורמט. המערכת ממירה אוטומטית במידת הצורך.',
                color: 'bg-brand-primary',
              },
              {
                num: '02',
                title: 'AI מנתח ב-3 ערוצים',
                desc: 'תמלול + ניתוח טון + ניתוח תוכן עסקי. הכול במקביל. תוך פחות מ-2 דקות.',
                color: 'bg-brand-secondary',
              },
              {
                num: '03',
                title: 'מקבלים דוח עם ציונים ותובנות',
                desc: '32+ פרמטרים, חוזקות והזדמנויות שיפור, ציטוטים מהשיחה — מוכן לשיתוף עם הנציג.',
                color: 'bg-brand-primary-light',
              },
              {
                num: '04',
                title: 'מתפתחים לאורך זמן',
                desc: 'מעקב אחרי שיפור של כל נציג, השוואות חודשיות, וזיהוי דפוסים חוזרים בכל הצוות.',
                color: 'bg-brand-secondary-dark',
              },
            ].map((step, idx) => (
              <div
                key={step.num}
                className={`group bg-white leaf-shape p-6 lg:p-8 flex items-center gap-6 lg:gap-10 hover:shadow-md transition-all ${
                  idx % 2 === 1 ? 'leaf-shape-alt' : ''
                }`}
              >
                <div
                  className={`${step.color} text-white font-display font-bold text-3xl lg:text-4xl w-20 h-20 lg:w-28 lg:h-28 leaf-shape-sm flex items-center justify-center flex-shrink-0`}
                >
                  {step.num}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl lg:text-2xl font-bold font-display text-neutral-900 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-neutral-600 leading-relaxed">{step.desc}</p>
                </div>
                <ArrowUpLeft className="hidden md:block w-6 h-6 text-neutral-300 group-hover:text-brand-primary group-hover:-translate-y-1 group-hover:-translate-x-1 transition-all flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-info-light text-brand-primary rounded-full text-sm font-medium mb-4">
              שקיפות מלאה • ללא הפתעות
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight">
              שתי דרכים. <span className="text-brand-gradient">אותה איכות.</span>
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              מינימום 5 נציגים • חיוב חודשי • ניתן לבטל בכל עת
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {PACKAGES.map((pkg, pkgIdx) => (
              <div
                key={pkg.id}
                className={`relative leaf-shape-lg p-8 lg:p-10 transition-transform ${
                  pkgIdx === 1 ? 'leaf-shape-alt lg:-translate-y-4' : ''
                } ${
                  pkg.highlight
                    ? 'bg-gradient-to-br from-brand-primary via-brand-primary-light to-brand-primary-dark text-white shadow-2xl'
                    : 'bg-white border border-neutral-200/80 shadow-lg'
                }`}
              >
                {pkg.highlight && (
                  <>
                    <div className="absolute top-6 left-6 inline-flex items-center gap-1 bg-brand-secondary text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                      <Star className="w-3 h-3 fill-white" />
                      הכי משתלם
                    </div>
                    <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-brand-secondary/20 leaf-shape -z-0" />
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 leaf-shape-alt" />
                  </>
                )}

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-baseline justify-between mb-6 mt-8">
                    <div>
                      <h3
                        className={`text-3xl font-bold font-display ${
                          pkg.highlight ? 'text-white' : 'text-neutral-900'
                        }`}
                      >
                        {pkg.name}
                      </h3>
                      <p
                        className={`text-sm mt-1 ${
                          pkg.highlight ? 'text-white/80' : 'text-neutral-500'
                        }`}
                      >
                        {pkg.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <span
                      className={`text-6xl font-bold font-display ${
                        pkg.highlight ? 'text-white' : 'text-brand-primary'
                      }`}
                    >
                      {pkg.pricePerAgent}
                    </span>
                    <span
                      className={
                        pkg.highlight ? 'text-white/80' : 'text-neutral-500'
                      }
                    >
                      ₪ / נציג / חודש
                    </span>
                  </div>
                  <div
                    className={`text-sm ${
                      pkg.highlight ? 'text-white/70' : 'text-neutral-500'
                    }`}
                  >
                    מינימום {pkg.minAgents} נציגים = {pkg.pricePerAgent * pkg.minAgents}
                    {' '}₪ לחודש
                  </div>

                  {/* Quota highlight */}
                  <div
                    className={`mt-6 p-5 ${
                      pkg.highlight ? 'bg-white/10 backdrop-blur' : 'bg-brand-bg'
                    } leaf-shape-sm`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-4xl font-bold font-display ${
                          pkg.highlight ? 'text-white' : 'text-brand-primary'
                        }`}
                      >
                        {pkg.callMinutes}
                      </span>
                      <span
                        className={`text-sm ${
                          pkg.highlight ? 'text-white/80' : 'text-neutral-600'
                        }`}
                      >
                        דקות ניתוח / נציג / חודש
                      </span>
                    </div>
                    <div
                      className={`mt-3 pt-3 border-t flex items-center justify-between text-sm ${
                        pkg.highlight ? 'border-white/20 text-white/90' : 'border-neutral-300 text-neutral-700'
                      }`}
                    >
                      <span>סה״כ במינימום ({pkg.minAgents} נציגים):</span>
                      <span className={`font-bold ${pkg.highlight ? 'text-white' : 'text-brand-primary'}`}>
                        {(pkg.callMinutes * pkg.minAgents).toLocaleString('he-IL')} דק׳
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="mt-6 space-y-3">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            pkg.highlight
                              ? 'text-brand-secondary-light'
                              : 'text-brand-secondary'
                          }`}
                        />
                        <span
                          className={`text-sm leading-relaxed ${
                            pkg.highlight ? 'text-white/95' : 'text-neutral-700'
                          }`}
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                    {pkg.extras.length > 0 && (
                      <>
                        <li className="pt-2 mt-2 border-t border-white/20">
                          <div className="text-xs uppercase tracking-wider text-white/70 font-bold mb-2">
                            ב-עסקי בנוסף:
                          </div>
                        </li>
                        {pkg.extras.map((f, i) => (
                          <li key={`extra-${i}`} className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5 text-brand-secondary-light" />
                            <span className="text-sm leading-relaxed text-white font-medium">
                              {f}
                            </span>
                          </li>
                        ))}
                      </>
                    )}
                  </ul>

                  <Link href="/signup" className="block mt-8">
                    <Button
                      size="lg"
                      className={`w-full text-base h-14 ${
                        pkg.highlight
                          ? 'bg-white text-brand-primary hover:bg-neutral-100 shadow-lg'
                          : ''
                      }`}
                      variant={pkg.highlight ? 'outline' : 'default'}
                    >
                      בחרו {pkg.name}
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Setup fee card */}
          <div className="mt-12 max-w-5xl mx-auto">
            <div className="bg-brand-bg border-2 border-dashed border-brand-primary/30 leaf-shape p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="w-14 h-14 bg-brand-primary leaf-shape-sm flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-brand-primary font-bold">
                      חד-פעמי
                    </div>
                    <div className="text-3xl font-bold font-display text-neutral-900">
                      2,000 ₪ עלות הקמה
                    </div>
                  </div>
                </div>

                <div className="flex-1 lg:border-r lg:border-neutral-300 lg:pr-6">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold text-brand-secondary mb-2 uppercase tracking-wider">
                        ✓ כלול בעלות
                      </div>
                      <ul className="space-y-1 text-sm text-neutral-700">
                        <li>• הגדרת חשבון ונציגים</li>
                        <li>• התאמת פרמטרים לארגון</li>
                        <li>• הדרכה ראשונית</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">
                        ✗ לא כלול
                      </div>
                      <ul className="space-y-1 text-sm text-neutral-500">
                        <li>• אינטגרציה עם CRM/מערכות</li>
                        <li>• פיתוחים מותאמים אישית</li>
                        <li>• מובא בהצעת מחיר נפרדת</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center mt-8 text-sm text-neutral-500">
            * מע״מ כדין • דקות נוספות זמינות לרכישה בכל עת • ביטול חודשי גמיש
          </p>
        </div>
      </section>

      {/* ========== SECURITY ========== */}
      <section id="security" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-neutral-900 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] -z-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="max-w-6xl mx-auto relative">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur text-white rounded-full text-sm font-medium mb-6 border border-white/20">
                <Lock className="w-4 h-4" />
                אבטחה ופרטיות
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight mb-6">
                שיחות הלקוחות שלך —
                <br />
                <span className="bg-gradient-to-r from-brand-secondary-light to-brand-info-light bg-clip-text text-transparent">
                  לא יוצאות מהכספת.
                </span>
              </h2>
              <p className="text-lg text-white/70 leading-relaxed max-w-xl mb-8">
                בנינו את Coachee עם אבטחה כעיקרון מנחה. כל הקלטה מוצפנת עם מפתח
                ייחודי משלה. הגישה מבוקרת ברמת מסד הנתונים. הצפנה צבאית — לא
                תוספת מאוחרת.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: 'AES-256', sub: 'הצפנה לכל קובץ' },
                  { title: 'Envelope', sub: 'מפתח ייחודי לקובץ' },
                  { title: 'TLS 1.3', sub: 'הצפנה בתעבורה' },
                  { title: 'RLS', sub: 'בידוד ברמת DB' },
                ].map((item, idx) => (
                  <div
                    key={item.title}
                    className={`bg-white/5 backdrop-blur border border-white/10 leaf-shape-sm p-4 ${
                      idx % 2 === 1 ? 'leaf-shape-alt' : ''
                    }`}
                  >
                    <div className="font-mono font-bold text-xl text-brand-secondary-light">
                      {item.title}
                    </div>
                    <div className="text-sm text-white/60 mt-1">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lock visual */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-primary blur-3xl opacity-30 rounded-full" />
                <div className="relative w-64 h-64 bg-gradient-to-br from-brand-primary via-brand-primary-light to-brand-secondary leaf-shape-lg flex items-center justify-center shadow-2xl">
                  <Lock className="w-32 h-32 text-white/90" strokeWidth={1.5} />
                </div>
                {/* Orbiting badges */}
                <div className="absolute -top-4 -right-4 bg-white text-neutral-900 px-3 py-2 leaf-shape-sm shadow-lg flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-secondary" />
                  <span className="text-xs font-bold">פעיל</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white text-neutral-900 px-3 py-2 leaf-shape-sm leaf-shape-alt shadow-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-secondary" />
                  <span className="text-xs font-bold">מבוקר</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section id="faq" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-brand-bg">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white text-brand-primary rounded-full text-sm font-medium border border-neutral-200 mb-4">
                  שאלות ותשובות
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold font-display leading-tight mb-4">
                  שאלות שאתם בטח שואלים
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  לא מצאתם תשובה?{' '}
                  <a
                    href="mailto:contact@coachee.co.il"
                    className="text-brand-primary font-semibold underline-offset-4 hover:underline"
                  >
                    דברו איתנו
                  </a>
                  .
                </p>
              </div>
            </div>
            <div className="lg:col-span-8 space-y-3">
              {FAQ.map((item, idx) => (
                <FAQItem key={item.q} q={item.q} a={item.a} defaultOpen={idx === 0} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-primary via-brand-primary-light to-brand-secondary leaf-shape-lg p-10 lg:p-16 text-white text-center">
            {/* Decorative shapes */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 leaf-shape" />
            <div className="absolute -bottom-12 -left-12 w-72 h-72 bg-brand-secondary/20 leaf-shape-alt" />
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            <div className="relative">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight">
                הפכו את כל שיחה
                <br />
                להזדמנות אימון.
              </h2>
              <p className="mt-4 text-xl text-white/90 max-w-2xl mx-auto">
                התחילו לראות מה הצוות שלכם באמת אומר ללקוחות.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-white text-brand-primary hover:bg-neutral-100 text-base h-14 px-8 group shadow-xl"
                  >
                    התחל ניסיון
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a href="mailto:contact@coachee.co.il">
                  <Button
                    variant="outline"
                    size="lg"
                    className="bg-transparent border-white/40 text-white hover:bg-white/10 text-base h-14 px-8"
                  >
                    דברו עם המומחים שלנו
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="px-4 sm:px-6 lg:px-8 py-16 bg-neutral-950 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-10">
            <div className="md:col-span-5">
              <div className="bg-white inline-block p-3 leaf-shape">
                <Image
                  src="/logo.png"
                  alt="Coachee"
                  width={140}
                  height={48}
                  className="object-contain h-10 w-auto"
                />
              </div>
              <p className="mt-5 text-neutral-400 leading-relaxed max-w-md">
                Coachee — פלטפורמת AI לניתוח ואימון צוותי מכירות ושירות בעברית.
                מאות שיחות נותחות מדי שבוע, אלפי דקות אימון, לקוחות שצומחים.
              </p>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-white/60">מוצר</h4>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li><a href="#how" className="hover:text-white transition-colors">איך זה עובד</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">תכונות</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">חבילות</a></li>
                <li><a href="#security" className="hover:text-white transition-colors">אבטחה</a></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-white/60">חשבון</h4>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li><Link href="/login" className="hover:text-white transition-colors">התחברות</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">הרשמה</Link></li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-white/60">משפטי</h4>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li><Link href="/privacy-policy" className="hover:text-white transition-colors">מדיניות פרטיות</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-white transition-colors">תנאי שימוש</Link></li>
                <li><Link href="/legal-terms" className="hover:text-white transition-colors">תנאים משפטיים</Link></li>
              </ul>
              <a
                href="mailto:contact@coachee.co.il"
                className="inline-block mt-6 text-brand-secondary-light hover:text-white transition-colors text-sm"
              >
                contact@coachee.co.il
              </a>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
            <div>© {new Date().getFullYear()} Coachee. כל הזכויות שמורות.</div>
            <div>נבנה בישראל</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
