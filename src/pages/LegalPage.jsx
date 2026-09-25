import { useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import SiteFooter from '../components/SiteFooter'
import TermsOfService from '../content/TermsOfService'
import PrivacyPolicy from '../content/PrivacyPolicy'

// Full-page versions of the legal documents, for the footer links. The
// same content components are shown in LegalModal during signup, so the
// text lives in one place.
const DOCUMENTS = {
  terms: { title: 'Terms of Service', Body: TermsOfService },
  privacy: { title: 'Privacy Policy', Body: PrivacyPolicy },
}

export default function LegalPage({ document }) {
  const { title, Body } = DOCUMENTS[document]

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [document])

  return (
    <div className="min-h-dvh bg-bg">
      <PageHeader backTo="/" backLabel="Home" />
      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
        <article className="mt-8 max-w-[70ch] text-sm leading-relaxed text-text-muted">
          <Body />
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
