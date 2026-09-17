function Section({ title, children }) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="mb-2 font-display text-sm font-semibold text-jet-black">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export default function TermsOfService() {
  return (
    <div>
      <p className="mb-6 text-xs font-medium uppercase tracking-wide text-lavender">
        Last updated: September 15, 2026
      </p>

      <Section title="1. Acceptance of these terms">
        <p>
          By creating a Lendrop account or using the Lendrop app, you agree to these Terms of
          Service. If you don't agree, please don't use Lendrop.
        </p>
      </Section>

      <Section title="2. Who can use Lendrop">
        <p>
          You must be at least 18 years old and hold a valid Salvadoran DUI (national ID) to
          create an account. The name, DUI number, and date of birth you provide at signup are
          used only to verify your identity for rentals and are stored separately from your
          public profile, and they are never shown to other users.
        </p>
      </Section>

      <Section title="3. What Lendrop is">
        <p>
          Lendrop is a peer to peer marketplace that lets people list items for other people to
          rent, and lets renters book and pay for those items, all inside the app. Lendrop is not
          the owner of listed items and is not a party to the rental agreement between a lender
          and a renter. We provide the platform, identity checks, smart locker logistics, and
          payment processing that make that agreement possible.
        </p>
      </Section>

      <Section title="4. Listing and renting items">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Lenders must accurately describe an item's condition, features, and price.</li>
          <li>Lenders must only list items they legally own or have explicit permission to rent out.</li>
          <li>An item's availability is determined by the app from actual confirmed reservations, not by a lender's manual claim. Once a date range is booked, it cannot be booked again for the same item, and a "Currently rented" status is shown automatically while a rental is in progress.</li>
          <li>Renters must return items in the condition they received them, normal wear excepted.</li>
          <li>Every drop off and pickup is documented with photo evidence, timestamped and tied to both parties' accounts, to protect both sides in a dispute.</li>
        </ul>
      </Section>

      <Section title="5. Smart lockers">
        <p>
          Items change hands exclusively through Lendrop's network of smart lockers, never
          through in person meetups. Each pickup or drop off requires a unique access code tied
          to your reservation, and every locker event (opened, by whom, when) is logged for
          traceability and dispute resolution.
        </p>
      </Section>

      <Section title="6. Payments, service fees, and security deposits">
        <p>
          Rental fees are charged through the app at the time of booking ("Pay in Advance"),
          before pickup. Certain items require a refundable security deposit, held until the item
          is returned and confirmed to be in the agreed upon condition. If photo evidence shows
          damage the renter is responsible for, the deposit may be withheld in part or in full to
          cover the cost, and the matter can be escalated as a dispute.
        </p>
        <p>
          Lendrop charges lenders a service fee, deducted from their payout once a rental's
          payment is processed, based on the value of the transaction: 5% for transactions up to
          $100, 10% for transactions up to $300, and 15% for transactions between $300 and the
          platform's maximum of $700. Lendrop Premium lenders pay no service fee.
        </p>
      </Section>

      <Section title="7. Cancellations">
        <p>
          Reservations can be cancelled from the app before the rental period begins, subject to
          the cancellation window shown at checkout. Cancellations after that window, or
          missed pickups, may not be eligible for a full refund.
        </p>
      </Section>

      <Section title="8. Reviews and reputation">
        <p>
          After a completed rental, both the lender and the renter can rate each other. Reviews
          must reflect an actual completed transaction and may not contain harassment, personal
          data, or unrelated content. We may remove reviews that violate this.
        </p>
      </Section>

      <Section title="9. Prohibited conduct">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Listing illegal, stolen, counterfeit, or dangerous items.</li>
          <li>Creating more than one account, or an account under someone else's identity.</li>
          <li>Attempting to complete a rental or payment outside the app to avoid fees or protections.</li>
          <li>Tampering with, sharing, or attempting to reuse a locker access code that isn't yours.</li>
        </ul>
      </Section>

      <Section title="10. Disputes">
        <p>
          If a lender and renter disagree about an item's condition, a late return, or a charge,
          either party can open a dispute from the reservation in the app. We review the photo
          evidence and locker event log for that reservation to help reach a resolution, which may
          include a partial or full refund, deposit release, or deposit withholding.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>
          Lendrop facilitates the connection, identity verification, payment, and logistics
          between lenders and renters, but is not liable for the condition, safety, or legality of
          items listed by users, except where required by Salvadoran law. Use of rented items is
          at your own risk.
        </p>
      </Section>

      <Section title="12. Suspending or closing your account">
        <p>
          We may suspend or close an account that violates these terms, provides false
          verification information, or is used fraudulently. You can request deletion of your
          account at any time, subject to completing any active reservations.
        </p>
      </Section>

      <Section title="13. Changes to these terms">
        <p>
          We may update these terms as Lendrop evolves. If we make a material change, we'll let
          you know in the app before it takes effect. Continuing to use Lendrop after a change
          means you accept the updated terms.
        </p>
      </Section>

      <Section title="14. Governing law">
        <p>These terms are governed by the laws of El Salvador.</p>
      </Section>

      <Section title="15. Contact">
        <p>
          Questions about these terms? Reach us at{' '}
          <span className="font-medium text-deep-purple">lendrop2026@gmail.com</span>.
        </p>
      </Section>
    </div>
  )
}
