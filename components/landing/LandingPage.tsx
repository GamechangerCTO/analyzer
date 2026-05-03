'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Phone,
  Mic,
  Brain,
  ShieldCheck,
  Lock,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  BarChart3,
  Users,
  Zap,
  MessageSquare,
  TrendingUp,
  Headphones,
  ChevronDown,
  Star,
  PlayCircle,
} from 'lucide-react'

const PACKAGES = [
  {
    id: 'professional',
    name: 'Professional',
    nameHe: 'מקצועי',
    tagline: 'מושלם לצוותי מכירות קטנים ובינוניים',
    pricePerAgent: 249,
    minAgents: 5,
    callMinutes: 150,
    simMinutes: 60,
    highlight: false,
    features: [
      { text: '150 דקות ניתוח שיחות / נציג / חודש', included: true },
      { text: '60 דקות סימולציות קוליות / נציג / חודש', included: true },
      { text: 'כל 6 סוגי השיחות (מכירה, שירות, תיאום וכו׳)', included: true },
      { text: 'דוחות סטנדרטיים + ציונים מפורטים', included: true },
      { text: 'הצפנה מתקדמת (AES-256 + Envelope Encryption)', included: true },
      { text: 'תמיכה באימייל (24-48 שעות)', included: true },
      { text: 'תובנות צוות מתקדמות', included: false },
      { text: 'גישת API', included: false },
      { text: 'Onboarding + check-in רבעוני', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    nameHe: 'עסקי',
    tagline: 'לחברות מתקדמות שדורשות יותר',
    pricePerAgent: 499,
    minAgents: 5,
    callMinutes: 499,
    simMinutes: 180,
    highlight: true,
    features: [
      { text: '499 דקות ניתוח שיחות / נציג / חודש', included: true },
      { text: '180 דקות סימולציות קוליות / נציג / חודש', included: true },
      { text: 'כל 6 סוגי השיחות + תרחישים מותאמים אישית', included: true },
      { text: 'דוחות מתקדמים + תובנות צוות AI', included: true },
      { text: 'הצפנה מתקדמת (AES-256 + Envelope Encryption)', included: true },
      { text: 'תמיכה בעדיפות (4 שעות) + ערוץ Slack ייעודי', included: true },
      { text: 'תובנות צוות מתקדמות + השוואות', included: true },
      { text: 'גישת API מלאה', included: true },
      { text: 'Onboarding מלא + check-in רבעוני', included: true },
    ],
  },
] as const

const FEATURES = [
  {
    icon: Mic,
    title: 'תמלול אוטומטי מדויק',
    description: 'הקלטות שיחה הופכות לטקסט בעברית תוך שניות, עם זיהוי דובר אוטומטי.',
    color: 'bg-brand-info-light text-brand-primary',
  },
  {
    icon: Brain,
    title: 'ניתוח AI ב-3 שכבות במקביל',
    description: 'תמלול + ניתוח טון רגשי + ניתוח תוכן עסקי — שלוש מערכות AI עובדות במקביל לתובנות מקיפות.',
    color: 'bg-brand-secondary-light text-brand-secondary-dark',
  },
  {
    icon: PlayCircle,
    title: 'סימולציות קוליות בזמן אמת',
    description: 'נציגים מתאמנים מול לקוח AI שמדבר, מתנגד ומגיב — כמו אימון אמיתי בלי הסיכון.',
    color: 'bg-brand-info-light text-brand-primary',
  },
  {
    icon: BarChart3,
    title: '32-35 פרמטרים לכל שיחה',
    description: 'דוח מקיף לכל שיחה: ציון כולל, חוזקות, הזדמנויות שיפור, התנגדויות שעלו, סגירה.',
    color: 'bg-brand-secondary-light text-brand-secondary-dark',
  },
  {
    icon: TrendingUp,
    title: 'מעקב התקדמות אישי וצוותי',
    description: 'דאשבורד חי לכל נציג, מנהל וצוות — עם השוואות ומגמות לאורך זמן.',
    color: 'bg-brand-info-light text-brand-primary',
  },
  {
    icon: ShieldCheck,
    title: 'אבטחה ופרטיות ברמה גבוהה',
    description: 'כל קובץ מוצפן עם AES-256 ומפתחות ייחודיים. הגישה לנתונים מבוקרת ברמת מסד הנתונים.',
    color: 'bg-brand-secondary-light text-brand-secondary-dark',
  },
] as const

const CALL_TYPES = [
  { name: 'שיחות מכירה Outbound', icon: Phone },
  { name: 'Follow-up לפני הצעת מחיר', icon: MessageSquare },
  { name: 'Follow-up אחרי הצעת מחיר', icon: MessageSquare },
  { name: 'תיאום פגישות', icon: Users },
  { name: 'Follow-up אחרי תיאום פגישה', icon: Users },
  { name: 'שירות לקוחות', icon: Headphones },
] as const

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'מעלים הקלטה',
    description: 'אפשר MP3, WAV, M4A — המערכת מזהה ומתאימה אוטומטית.',
  },
  {
    step: '2',
    title: 'ה-AI מנתח במקביל',
    description: 'תוך דקות — תמלול, ניתוח טון, וניתוח תוכן עסקי מקיף.',
  },
  {
    step: '3',
    title: 'מקבלים דוח ותובנות',
    description: 'ציונים, חוזקות, נקודות לשיפור — מוכן לשיתוף עם הנציג.',
  },
  {
    step: '4',
    title: 'מתאמנים בסימולציה',
    description: 'הנציג מתאמן על נקודות החולשה מול לקוח AI שמדבר אמיתית.',
  },
] as const

const FAQ = [
  {
    q: 'איך זה שונה מתוכנות הקלטה רגילות?',
    a: 'אנחנו לא מחליפים את ההקלטה — אנחנו מנתחים אותה. בעוד שתוכנות אחרות שומרות את ההקלטה, Coachee מבינה מה נאמר, איך זה נאמר (טון, רגש), ונותנת לך דוח עסקי מעשי לשיפור.',
  },
  {
    q: 'באיזו שפה השיחות?',
    a: 'המערכת מכוונת לעברית מלאה — כולל ניתוח, דוחות וממשק. אבל היא תומכת גם בשיחות באנגלית.',
  },
  {
    q: 'האם הנתונים שלנו מאובטחים?',
    a: 'כן. כל ההקלטות והניתוחים מוצפנים בהצפנת AES-256 עם מפתחות ייחודיים לכל קובץ (Envelope Encryption). הגישה מבוקרת ברמת מסד הנתונים (RLS), כך שכל לקוח רואה רק את הנתונים שלו.',
  },
  {
    q: 'מה קורה אם נחרגה מכמות הדקות?',
    a: 'תקבלו התראה ב-80% מהמכסה. אפשר לרכוש דקות נוספות בכל עת, או לשדרג לחבילה גדולה יותר.',
  },
  {
    q: 'האם ניתן לבטל?',
    a: 'כן, ניתן לבטל בכל חודש בודד. אין התחייבות שנתית.',
  },
  {
    q: 'כמה זמן לוקח להטמיע במשרד?',
    a: 'בחבילה Professional — תוך יום עבודה. בחבילה Business אנו עוזרים בהטמעה מלאה תוך 1-2 שבועות, כולל הדרכה לצוות.',
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

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-neutral-200 py-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-right gap-4"
      >
        <span className="text-lg font-semibold text-neutral-900">{q}</span>
        <ChevronDown
          className={`h-5 w-5 text-brand-primary transition-transform flex-shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <p className="mt-3 text-neutral-600 leading-relaxed animate-fade-in">{a}</p>
      )}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-bg-light">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Coachee"
              width={140}
              height={48}
              className="object-contain h-12 w-auto"
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <a href="#features" className="hover:text-brand-primary transition-colors">
              תכונות
            </a>
            <a href="#how-it-works" className="hover:text-brand-primary transition-colors">
              איך זה עובד
            </a>
            <a href="#pricing" className="hover:text-brand-primary transition-colors">
              חבילות ומחירים
            </a>
            <a href="#security" className="hover:text-brand-primary transition-colors">
              אבטחה
            </a>
            <a href="#faq" className="hover:text-brand-primary transition-colors">
              שאלות נפוצות
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                התחברות
              </Button>
            </Link>
            <a href="#pricing">
              <Button size="sm">התחל עכשיו</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-brand-gradient opacity-[0.04]" aria-hidden />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl" aria-hidden />
        <div className="absolute bottom-0 -right-20 w-72 h-72 bg-brand-secondary/10 rounded-full blur-3xl" aria-hidden />

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Hero logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="Coachee"
              width={280}
              height={96}
              className="object-contain h-20 sm:h-24 w-auto"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-info-light text-brand-primary rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            פלטפורמת AI מתקדמת לצוותי מכירות ושירות
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display text-neutral-900 leading-tight tracking-tight">
            הפכו כל שיחה
            <br />
            <span className="text-brand-gradient">להזדמנות אימון</span>
          </h1>

          <p className="mt-6 text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            Coachee מנתחת את שיחות הצוות שלכם באמצעות AI מתקדם, מספקת תובנות
            מעשיות לשיפור, ומאפשרת לנציגים להתאמן בסימולציות קוליות חיות —
            הכול בעברית, מאובטח ופשוט לשימוש.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#pricing">
              <Button size="lg" className="text-base h-12 px-8 group">
                התחילו לנתח עכשיו
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </a>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="text-base h-12 px-8">
                איך זה עובד?
              </Button>
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: '6', label: 'סוגי שיחות נתמכים' },
              { value: '32-35', label: 'פרמטרים לכל ניתוח' },
              { value: '<2 דק׳', label: 'זמן ניתוח ממוצע' },
              { value: 'AES-256', label: 'הצפנה מתקדמת' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-brand-primary font-display">
                  {stat.value}
                </div>
                <div className="text-sm text-neutral-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-secondary-light text-brand-secondary-dark rounded-full text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              תכונות עיקריות
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold font-display text-neutral-900">
              כל מה שצריך כדי לשפר ביצועי צוות
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
              מתמלול עד אימון אישי — Coachee מספקת ערכת כלים מקיפה לפיתוח כל נציג.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <div
                key={feature.title}
                className={`coachee-card-leaf p-6 hover:scale-[1.02] transition-transform ${
                  idx % 2 === 1 ? 'leaf-shape-alt' : ''
                }`}
              >
                <div
                  className={`w-12 h-12 leaf-shape-sm flex items-center justify-center ${feature.color}`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-neutral-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-neutral-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Call types */}
          <div className="mt-20 bg-brand-bg rounded-3xl p-8 lg:p-12">
            <div className="text-center mb-10">
              <h3 className="text-2xl font-bold font-display text-neutral-900">
                6 סוגי שיחות, כל אחד עם ניתוח מותאם
              </h3>
              <p className="mt-2 text-neutral-600">
                כל סוג שיחה נחקר עם פרמטרים ייחודיים שמתאימים למטרה שלו
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CALL_TYPES.map((type, idx) => (
                <div
                  key={type.name}
                  className={`bg-white p-4 flex items-center gap-3 border border-neutral-200/80 ${
                    idx % 2 === 0 ? 'leaf-shape-sm' : 'leaf-shape-sm leaf-shape-alt'
                  }`}
                >
                  <div className="w-10 h-10 bg-brand-info-light leaf-shape-sm flex items-center justify-center flex-shrink-0">
                    <type.icon className="w-5 h-5 text-brand-primary" />
                  </div>
                  <span className="font-medium text-neutral-700 text-sm">
                    {type.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-brand-bg-light">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-info-light text-brand-primary rounded-full text-sm font-medium mb-4">
              4 צעדים פשוטים
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold font-display text-neutral-900">
              איך זה עובד?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.step} className="relative">
                <div
                  className={`coachee-card-leaf p-6 h-full ${
                    idx % 2 === 1 ? 'leaf-shape-alt' : ''
                  }`}
                >
                  <div className="w-12 h-12 bg-brand-primary-gradient leaf-shape-sm flex items-center justify-center text-white text-xl font-bold font-display">
                    {step.step}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-neutral-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-neutral-600">{step.description}</p>
                </div>
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -left-3 w-6 h-px bg-brand-primary/30">
                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-brand-primary rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-secondary-light text-brand-secondary-dark rounded-full text-sm font-medium mb-4">
              שקיפות מלאה • ללא עמלות נסתרות
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold font-display text-neutral-900">
              חבילות מותאמות לכל צוות
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
              מינימום 5 נציגים • חיוב חודשי גמיש • ניתן לבטל בכל עת
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {PACKAGES.map((pkg, pkgIdx) => (
              <div
                key={pkg.id}
                className={`relative leaf-shape-lg p-8 ${
                  pkgIdx === 1 ? 'leaf-shape-alt' : ''
                } ${
                  pkg.highlight
                    ? 'bg-brand-primary-gradient text-white shadow-brand-strong scale-[1.02]'
                    : 'bg-white border border-neutral-200/80 shadow-brand-soft'
                }`}
              >
                {pkg.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-secondary text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" />
                    הכי פופולרי
                  </div>
                )}

                <div>
                  <h3
                    className={`text-2xl font-bold font-display ${
                      pkg.highlight ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    {pkg.nameHe}
                  </h3>
                  <p
                    className={`mt-1 text-sm ${
                      pkg.highlight ? 'text-white/80' : 'text-neutral-500'
                    }`}
                  >
                    {pkg.tagline}
                  </p>
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  <span
                    className={`text-5xl font-bold font-display ${
                      pkg.highlight ? 'text-white' : 'text-brand-primary'
                    }`}
                  >
                    {pkg.pricePerAgent}
                  </span>
                  <span
                    className={pkg.highlight ? 'text-white/80' : 'text-neutral-500'}
                  >
                    ₪ / נציג / חודש
                  </span>
                </div>

                <div
                  className={`mt-2 text-sm ${
                    pkg.highlight ? 'text-white/70' : 'text-neutral-500'
                  }`}
                >
                  מינימום {pkg.minAgents} נציגים = {pkg.pricePerAgent * pkg.minAgents} ₪/חודש
                </div>

                <div
                  className={`mt-6 pt-6 border-t ${
                    pkg.highlight ? 'border-white/20' : 'border-neutral-200'
                  } space-y-3`}
                >
                  {pkg.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <CheckCircle2
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            pkg.highlight ? 'text-brand-secondary-light' : 'text-brand-secondary'
                          }`}
                        />
                      ) : (
                        <div className="w-5 h-5 flex-shrink-0 mt-0.5 flex items-center justify-center">
                          <div
                            className={`w-3 h-px ${
                              pkg.highlight ? 'bg-white/30' : 'bg-neutral-300'
                            }`}
                          />
                        </div>
                      )}
                      <span
                        className={`text-sm leading-relaxed ${
                          feature.included
                            ? pkg.highlight
                              ? 'text-white'
                              : 'text-neutral-700'
                            : pkg.highlight
                            ? 'text-white/40 line-through'
                            : 'text-neutral-400 line-through'
                        }`}
                      >
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                <Link href="/signup" className="block mt-8">
                  <Button
                    size="lg"
                    className={`w-full text-base h-12 ${
                      pkg.highlight
                        ? 'bg-white text-brand-primary hover:bg-neutral-100'
                        : ''
                    }`}
                    variant={pkg.highlight ? 'outline' : 'default'}
                  >
                    התחל בחבילת {pkg.nameHe}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Pricing footnote */}
          <div className="mt-12 text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-secondary" /> ללא דמי
                התקנה
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-secondary" /> חיוב
                חודשי בלבד
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-secondary" /> ביטול
                גמיש
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-secondary" /> מע״מ
                כדין
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 px-4 sm:px-6 lg:px-8 bg-brand-bg">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-info-light text-brand-primary rounded-full text-sm font-medium mb-4">
                <Lock className="w-4 h-4" />
                אבטחה ופרטיות
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold font-display text-neutral-900">
                הנתונים שלכם —
                <br />
                <span className="text-brand-gradient">מוגנים תמיד</span>
              </h2>
              <p className="mt-4 text-lg text-neutral-600 leading-relaxed">
                בנינו את Coachee עם אבטחה כעיקרון מנחה. כל הקלטה, כל תמלול וכל
                ניתוח — מוצפנים ברמה הגבוהה ביותר בתעשייה.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    title: 'הצפנת AES-256 לכל קובץ',
                    desc: 'כל קובץ אודיו מקבל מפתח הצפנה ייחודי משלו (Envelope Encryption).',
                  },
                  {
                    title: 'בידוד נתונים ברמת מסד הנתונים',
                    desc: 'Row-Level Security מבטיחה שכל לקוח רואה רק את הנתונים שלו.',
                  },
                  {
                    title: 'תקשורת מוצפנת בתעבורה',
                    desc: 'TLS 1.3 בכל בקשה — אין שום נקודה שבה הנתונים עוברים בלי הצפנה.',
                  },
                  {
                    title: 'בקרת גישה מתקדמת',
                    desc: 'הרשאות לפי תפקיד (Super Admin, Admin, Manager, Agent) עם תיעוד מלא.',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-10 h-10 bg-brand-secondary-light leaf-shape-sm flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 text-brand-secondary-dark" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900">{item.title}</h4>
                      <p className="text-sm text-neutral-600 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-white leaf-shape-lg p-8 shadow-brand-strong">
                <div className="flex items-center gap-3 pb-6 border-b border-neutral-200">
                  <div className="w-12 h-12 bg-brand-primary-gradient leaf-shape-sm flex items-center justify-center">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900">סטנדרטי אבטחה</h4>
                    <p className="text-sm text-neutral-500">
                      תקנים שאנחנו עומדים בהם
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    { name: 'AES-256 Encryption', status: 'פעיל' },
                    { name: 'TLS 1.3 in transit', status: 'פעיל' },
                    { name: 'Row-Level Security (RLS)', status: 'פעיל' },
                    { name: 'Envelope Encryption', status: 'פעיל' },
                    { name: 'Role-Based Access Control', status: 'פעיל' },
                    { name: 'Audit logs מלא', status: 'פעיל' },
                  ].map((item, idx) => (
                    <div
                      key={item.name}
                      className={`flex items-center justify-between p-3 bg-brand-bg-light ${
                        idx % 2 === 0 ? 'leaf-shape-sm' : 'leaf-shape-sm leaf-shape-alt'
                      }`}
                    >
                      <span className="text-sm font-medium text-neutral-700">
                        {item.name}
                      </span>
                      <span className="success-indicator">
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-info-light text-brand-primary rounded-full text-sm font-medium mb-4">
              שאלות נפוצות
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold font-display text-neutral-900">
              שאלות שאתם בטח שואלים
            </h2>
          </div>

          <div>
            {FAQ.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-brand-primary-gradient">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl sm:text-5xl font-bold font-display">
            מוכנים לשפר את כל שיחה?
          </h2>
          <p className="mt-4 text-xl text-white/90">
            הצטרפו לחברות שכבר משדרגות את צוותי המכירות שלהן עם Coachee.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-brand-primary hover:bg-neutral-100 text-base h-12 px-8 group"
              >
                התחל ניסיון
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="mailto:contact@coachee.co.il">
              <Button
                variant="outline"
                size="lg"
                className="bg-transparent border-white text-white hover:bg-white/10 text-base h-12 px-8"
              >
                דברו איתנו
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="bg-white inline-block p-3 leaf-shape">
                <Image
                  src="/logo.png"
                  alt="Coachee"
                  width={140}
                  height={48}
                  className="object-contain h-10 w-auto"
                />
              </div>
              <p className="mt-4 text-sm text-neutral-400 leading-relaxed">
                פלטפורמת AI מתקדמת לניתוח ואימון צוותי מכירות ושירות.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">מוצר</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    תכונות
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    חבילות ומחירים
                  </a>
                </li>
                <li>
                  <a href="#security" className="hover:text-white transition-colors">
                    אבטחה
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">משפטי</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li>
                  <Link href="/privacy-policy" className="hover:text-white transition-colors">
                    מדיניות פרטיות
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="hover:text-white transition-colors">
                    תנאי שימוש
                  </Link>
                </li>
                <li>
                  <Link href="/legal-terms" className="hover:text-white transition-colors">
                    תנאים משפטיים
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">צרו קשר</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li>
                  <a
                    href="mailto:contact@coachee.co.il"
                    className="hover:text-white transition-colors"
                  >
                    contact@coachee.co.il
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    התחברות
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-white transition-colors">
                    הרשמה
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-neutral-800 text-center text-sm text-neutral-500">
            © {new Date().getFullYear()} Coachee. כל הזכויות שמורות.
          </div>
        </div>
      </footer>
    </div>
  )
}
