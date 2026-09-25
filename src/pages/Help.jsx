import { Link } from 'react-router-dom'
import { ChevronDown, KeyRound, Mail, PackageSearch, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SiteFooter, { SUPPORT_EMAIL } from '../components/SiteFooter'
import useHashScroll from '../hooks/useHashScroll'

// Help center: shortcuts, an FAQ grouped by topic, and contact. Every
// answer describes what the app actually does today, or quotes the Terms
// of Service (src/content/TermsOfService.jsx) -- update both together.

const SHORTCUTS = [
  { to: '/rental-tracking', icon: PackageSearch, title: 'Track a rental', desc: 'See where your item is and open the locker.' },
  { to: '/profile', icon: KeyRound, title: 'Your Lendrop ID', desc: 'The private code you use at the locker.' },
  { to: '/verification', icon: ShieldCheck, title: 'Verify your identity', desc: 'Required before you list an item.' },
]

const TOPICS = [
  {
    id: 'renting',
    title: 'Renting',
    questions: [
      {
        q: 'How does renting work?',
        a: 'Find an item in Explore, pick your dates and pay online. Once the rental is confirmed you get a locker and compartment. When the owner has dropped the item off, go to the locker, confirm it is you with your DUI and Lendrop ID, and the compartment opens.',
      },
      {
        q: 'Do I ever have to meet the owner?',
        a: 'No. The owner leaves the item in the locker and you pick it up there. When you are done you return it to the same locker.',
      },
      {
        q: 'The item is not in the locker yet. What now?',
        a: 'Open Track a rental. Until the owner drops the item off, it says "Waiting for the lender to drop off the item", and the pickup step unlocks as soon as they do.',
      },
      {
        q: 'Can I cancel a reservation?',
        a: 'Yes, from Activity, before the rental period begins and within the cancellation window shown at checkout. Once the owner has dropped the item off it can no longer be cancelled in the app; contact us instead. Cancellations outside the window, or missed pickups, may not be eligible for a full refund.',
      },
    ],
  },
  {
    id: 'lockers',
    title: 'Lockers & Lendrop ID',
    questions: [
      {
        q: 'What is my Lendrop ID?',
        a: 'A private 6-character code, shown as ABC-123, that only you can see. You enter it together with your DUI to open a compartment. Find it on your profile.',
      },
      {
        q: 'Someone saw my Lendrop ID.',
        a: 'Get a new one from your profile ("Someone saw it? Get a new Lendrop ID"). You confirm your account password, and the old ID stops opening lockers straight away. Lendrop will never ask you for your ID.',
      },
      {
        q: 'It says "Too many wrong attempts".',
        a: 'After 5 wrong DUI and Lendrop ID attempts in 15 minutes, the locker check pauses for 15 minutes to keep your compartment safe. Wait, then try again with the ID shown on your profile.',
      },
      {
        q: 'Will my item fit in a locker?',
        a: 'When you list an item, Lendrop estimates its packed size and checks it against the locker compartment sizes before it can be published as available.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments, deposits & fees',
    questions: [
      {
        q: 'When do I pay?',
        a: 'When you book, before pickup. You pay by card online; the rental is confirmed once the payment clears.',
      },
      {
        q: 'What is the damage-liability hold?',
        a: 'For some items an amount is held on your card, not charged. It is released automatically when the item comes back with no damage. If photo evidence shows damage, it may be withheld in part or in full, and either side can open a dispute.',
      },
      {
        q: 'What does Lendrop charge hosts?',
        a: 'A service fee deducted from the host payout, based on the transaction: 5% up to $100, 10% up to $300, and 15% from $300 to the $700 maximum. It never adds to what the renter pays. Lendrop Premium hosts pay no service fee.',
      },
      {
        q: 'When do hosts get paid?',
        a: 'The payout is released after the item has been returned to the locker and collected. You can follow it in Lender statistics.',
      },
    ],
  },
  {
    id: 'hosting',
    title: 'Hosting',
    questions: [
      {
        q: 'How do I start hosting?',
        a: 'Choose Become a host, complete the short onboarding, and verify your identity with your DUI. Identity verification is required before you can publish an item.',
      },
      {
        q: 'How do I price my item?',
        a: 'When you publish, Lendrop suggests a daily price based on similar items. You always set the final price.',
      },
      {
        q: 'How do I hand the item over?',
        a: 'After a rental is paid, open Drop-offs & returns, photograph the item and confirm the drop-off at the assigned locker with your DUI and Lendrop ID. When it comes back, you collect it the same way.',
      },
      {
        q: 'The item came back damaged.',
        a: 'When you collect the return, choose "Report damage instead", add a photo of the damage and describe it. The rental is marked as disputed and the damage hold stays in place while it is reviewed.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & safety',
    questions: [
      {
        q: 'Who can use Lendrop?',
        a: 'Anyone 18 or older with a valid Salvadoran DUI.',
      },
      {
        q: 'How does Lendrop keep handoffs safe?',
        a: 'Hosts verify their identity before listing, the item is photographed when it goes into the locker and when it comes back, and every compartment opening is logged with who opened it and when. After each rental both sides review each other.',
      },
      {
        q: 'Where is my DUI stored, and who sees it?',
        a: 'In a private part of your account that only you can read. Your public profile shows your name, photo and reviews, never your DUI, date of birth or Lendrop ID.',
      },
    ],
  },
]

function Faq({ q, a }) {
  return (
    <details className="faq group border-b border-border last:border-0">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 font-semibold text-text marker:hidden hover:text-primary">
        {q}
        <ChevronDown className="faq-chevron mt-0.5 h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
      </summary>
      <p className="max-w-[65ch] pb-5 text-sm leading-relaxed text-text-muted">{a}</p>
    </details>
  )
}

export default function Help() {
  useHashScroll()

  return (
    <div className="min-h-dvh bg-bg">
      <PageHeader backTo="/" backLabel="Home" maxWidth="max-w-5xl" />

      <section className="brand-field">
        <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
          <h1 className="text-4xl font-extrabold leading-[1.02] sm:text-6xl">How can we help?</h1>
          <p className="mt-4 max-w-[52ch] text-soft-white/85">
            Answers about renting, lockers, payments and hosting, or write to us.
          </p>
          <nav aria-label="Help topics" className="mt-8 flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <a
                key={topic.id}
                href={`#${topic.id}`}
                className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-semibold text-soft-white hover:border-white"
              >
                {topic.title}
              </a>
            ))}
            <a
              href="#contact"
              className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-semibold text-soft-white hover:border-white"
            >
              Contact
            </a>
          </nav>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
        <div className="grid gap-3 sm:grid-cols-3">
          {SHORTCUTS.map(({ to, icon: Icon, title, desc }) => (
            <Link key={to} to={to} className="rounded-2xl border border-border bg-surface p-5 hover:border-primary">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-3 font-bold">{title}</p>
              <p className="mt-1 text-sm text-text-muted">{desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-14 space-y-12">
          {TOPICS.map((topic) => (
            <section key={topic.id} id={topic.id} className="scroll-mt-24" aria-labelledby={`${topic.id}-title`}>
              <h2 id={`${topic.id}-title`} className="text-2xl font-extrabold sm:text-3xl">
                {topic.title}
              </h2>
              <div className="mt-4 rounded-2xl border border-border bg-surface px-5">
                {topic.questions.map((item) => (
                  <Faq key={item.q} {...item} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section id="contact" className="mt-14 scroll-mt-24 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Still need help?</h2>
          <p className="mt-3 max-w-[60ch] text-sm text-text-muted">
            Write to us and include the item name and your rental dates, so we can find the
            reservation quickly. For a problem with an item's condition, open a dispute from the
            reservation first: we review its photos and locker log.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="cta-brand mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-soft-white"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email {SUPPORT_EMAIL}
          </a>
          <p className="mt-6 text-sm text-text-muted">
            See also our{' '}
            <Link to="/terms" className="font-semibold text-primary underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="font-semibold text-primary underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
