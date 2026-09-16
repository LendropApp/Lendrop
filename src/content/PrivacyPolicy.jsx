function Section({ title, children }) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="mb-2 font-display text-sm font-semibold text-jet-black">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export default function PrivacyPolicy() {
  return (
    <div>
      <p className="mb-6 text-xs font-medium uppercase tracking-wide text-lavender">
        Last updated: September 15, 2026
      </p>

      <Section title="1. What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><span className="font-medium text-jet-black">Public profile:</span> full name, avatar, and your rental reputation (rating, review count).</li>
          <li><span className="font-medium text-jet-black">Private verification data:</span> DUI number and date of birth, collected at signup to confirm you're a real, eligible adult.</li>
          <li><span className="font-medium text-jet-black">Contact info:</span> email and, if you become a lender, a phone number.</li>
          <li><span className="font-medium text-jet-black">Listings and transaction data:</span> items you list or rent, photos, prices, reservations, and payment records.</li>
          <li><span className="font-medium text-jet-black">Locker activity:</span> which locker and compartment was opened, by whom, and when.</li>
          <li><span className="font-medium text-jet-black">Photo evidence:</span> item condition photos taken at drop-off and pickup.</li>
        </ul>
      </Section>

      <Section title="2. How we use it">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To verify your identity and eligibility to use Lendrop.</li>
          <li>To operate rentals: bookings, payments, locker access, and notifications.</li>
          <li>To resolve disputes, using photo evidence and locker logs tied to the specific reservation.</li>
          <li>To keep the marketplace safe — detecting fraud, fake listings, and abuse.</li>
          <li>To show you a public profile and reputation other users can see before renting with you.</li>
        </ul>
      </Section>

      <Section title="3. What we never make public">
        <p>
          Your DUI number and date of birth are stored separately from your public profile and
          are only accessible to you and, where legally required, to Lendrop for verification and
          dispute purposes. Other users only ever see your name, avatar, and rental reputation —
          never your national ID or birth date.
        </p>
      </Section>

      <Section title="4. Who we share data with">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>The other party in a reservation sees only what's needed to complete it (your public profile, item, and pickup/return details).</li>
          <li>Our payment processor, to process rental charges and security deposits.</li>
          <li>Authorities, only if legally required — for example, in response to a valid court order.</li>
        </ul>
        <p>We do not sell your personal data to third parties.</p>
      </Section>

      <Section title="5. How we protect it">
        <p>
          Access to your data is controlled at the database level: sensitive fields like your DUI
          and date of birth live in a separate, owner-only record that only your account can read,
          independent from your public profile. Photo evidence and locker logs are similarly
          restricted to the people involved in that specific reservation.
        </p>
      </Section>

      <Section title="6. How long we keep it">
        <p>
          We keep account and transaction data for as long as your account is active, and for a
          reasonable period after to meet legal, tax, and dispute-resolution obligations. You can
          request deletion of your account at any time; verification data tied to a completed
          transaction may be retained where required by law.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p>
          You can access, correct, or request deletion of your personal data at any time by
          contacting us. If you delete your account, your public listings and reviews are removed;
          transaction records needed for legal or dispute purposes may be retained.
        </p>
      </Section>

      <Section title="8. Children">
        <p>
          Lendrop is not intended for anyone under 18, and we don't knowingly collect data from
          minors. Our identity verification step exists specifically to prevent this.
        </p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          If we make a material change to how we handle your data, we'll notify you in the app
          before it takes effect.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions about your data? Reach us at{' '}
          <span className="font-medium text-deep-purple">privacidad@lendrop.sv</span>.
        </p>
      </Section>
    </div>
  )
}
