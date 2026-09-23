import { useState } from 'react'
import { LockKeyhole, Plus } from 'lucide-react'

import Button from '../components/ui/Button'
import ControlPanelNav from '../components/ui/ControlPanelNav'
import DoorCard from '../components/ui/DoorCard'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import LedStatus from '../components/ui/LedStatus'
import Modal from '../components/ui/Modal'
import Plate from '../components/ui/Plate'
import PriceSticker from '../components/ui/PriceSticker'
import RentalTrack from '../components/ui/RentalTrack'
import Select from '../components/ui/Select'
import SizeTag from '../components/ui/SizeTag'
import Skeleton from '../components/ui/Skeleton'
import SplitFlapCode from '../components/ui/SplitFlapCode'
import Textarea from '../components/ui/Textarea'
import Toast, { ToastViewport } from '../components/ui/Toast'

/**
 * /styleguide — development only, mounted from App.jsx behind import.meta.env.DEV.
 *
 * Every ui/ component in every state, rendered twice: once on `steel` (the app
 * background) and once on `night` (landing and auth). Phase 2 of the redesign
 * is not done until this page satisfies DESIGN.md sec. 12 end to end.
 *
 * Nothing here talks to Supabase — all data is literal, so the page renders
 * signed out and offline.
 */

/** One labelled specimen slot. */
function Swatch({ name, note, children, dark = false }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span
          className={`font-mono text-label uppercase ${dark ? 'text-panel/60' : 'text-steel-600'}`}
        >
          {name}
        </span>
        {note && (
          <span className={`text-small ${dark ? 'text-panel/60' : 'text-steel-600'}`}>{note}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

/** A section, rendered on steel and again on night. */
function Section({ title, meta, children }) {
  return (
    <section className="flex flex-col gap-6">
      <Plate title={title} meta={meta} />

      <div className="flex flex-col gap-6 rounded-door border-2 border-ink bg-steel p-4 md:p-6">
        <span className="font-mono text-label uppercase text-steel-600">On steel</span>
        {children(false)}
      </div>

      <div className="flex flex-col gap-6 rounded-door border-2 border-ink bg-night p-4 md:p-6">
        <span className="font-mono text-label uppercase text-panel/60">On night</span>
        {children(true)}
      </div>
    </section>
  )
}

const DEMO_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
      '<rect width="400" height="300" fill="#d6d4e0"/>' +
      '<rect x="150" y="105" width="100" height="90" fill="#433075"/>' +
      '</svg>'
  )

export default function Styleguide() {
  const [modalOpen, setModalOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(true)
  const [trackStep, setTrackStep] = useState(2)
  const [flapKey, setFlapKey] = useState(0)

  return (
    <div className="min-h-screen bg-steel pb-24">
      <header className="border-b-[3px] border-ink bg-panel">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-4 py-6 md:px-8">
          <span className="font-mono text-label uppercase text-steel-600">
            Development only · DESIGN.md sec. 7
          </span>
          <h1 className="font-display text-display-l uppercase text-ink">Locker Brutalism</h1>
          <p className="max-w-prose text-body text-steel-600">
            Every base component in every state. If something here disagrees with DESIGN.md,
            DESIGN.md wins.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-14 px-4 py-10 md:px-8">
        {/* ── Button ─────────────────────────────────────────────────── */}
        <Section title="Button" meta="5 variants · sec. 7.1">
          {(dark) => (
            <>
              <Swatch name="Variants" dark={dark}>
                <Button variant="primary">Reserve</Button>
                <Button variant="secondary">Cancel</Button>
                <Button variant="signal" icon={LockKeyhole}>
                  Open locker
                </Button>
                <Button variant="danger">Delete listing</Button>
                <Button variant="ghost" onDark={dark}>
                  Skip for now
                </Button>
              </Swatch>

              <Swatch name="Loading" note="compartment spinner, not a circle" dark={dark}>
                <Button variant="primary" loading loadingLabel="Publishing…">
                  Publish
                </Button>
                <Button variant="secondary" loading />
              </Swatch>

              <Swatch name="Disabled" dark={dark}>
                <Button variant="primary" disabled>
                  Reserve
                </Button>
                <Button variant="signal" disabled>
                  Open locker
                </Button>
                <Button variant="ghost" onDark={dark} disabled>
                  Skip for now
                </Button>
              </Swatch>

              <Swatch name="Small" note="dense toolbars only" dark={dark}>
                <Button size="sm" variant="secondary">
                  Edit
                </Button>
                <Button size="sm" variant="primary" icon={Plus}>
                  Add photo
                </Button>
              </Swatch>
            </>
          )}
        </Section>

        {/* ── Form controls ──────────────────────────────────────────── */}
        <Section title="Form controls" meta="sec. 7.2">
          {(dark) => (
            <>
              <div className="grid w-full gap-4 md:grid-cols-2">
                <Input label="Item title" placeholder="Canon EOS R50" defaultValue="" />
                <Input
                  label="Price per day"
                  numeric
                  suffix="$"
                  defaultValue="12.00"
                  help="What a renter pays per day, before fees."
                />
                <Input
                  label="Width"
                  numeric
                  suffix="cm"
                  defaultValue="40"
                  error="Enter a width in centimetres so we can pick a locker size."
                />
                <Input label="Locked field" defaultValue="Not editable" disabled />
                <Select
                  label="Category"
                  placeholder="Pick a category"
                  defaultValue=""
                  options={[
                    { value: 'cameras', label: 'Cameras' },
                    { value: 'tools', label: 'Tools' },
                    { value: 'camping', label: 'Camping' },
                  ]}
                />
                <Select
                  label="Locker size"
                  defaultValue="m"
                  error="That locker size is full on those dates. Try another size."
                  options={[
                    { value: 's', label: 'S' },
                    { value: 'm', label: 'M' },
                    { value: 'l', label: 'L' },
                  ]}
                />
              </div>

              <Textarea
                label="Description"
                rows={3}
                help="Say what it is, what is included, and anything a renter should know."
                placeholder="Includes the 18-45mm lens, a charger and a 64GB card."
              />

              <p className={`text-small ${dark ? 'text-panel/60' : 'text-steel-600'}`}>
                Tab through the fields to check the focus ring: 3px lilac, 3px offset.
              </p>
            </>
          )}
        </Section>

        {/* ── Status atoms ───────────────────────────────────────────── */}
        <Section title="Status" meta="LED · size · price">
          {(dark) => (
            <>
              <Swatch name="LedStatus" note="5 states, sec. 2 + 7.3" dark={dark}>
                {/* Always on a panel plate: LedStatus labels are text-ink, which
                    would drop to ~1.2:1 straight on night. */}
                <span className="flex flex-wrap gap-4 rounded-door bg-panel px-3 py-2">
                  <LedStatus status="available" />
                  <LedStatus status="reserved" />
                  <LedStatus status="ready" />
                  <LedStatus status="unavailable" />
                  <LedStatus status="problem" />
                </span>
              </Swatch>

              <Swatch name="SizeTag" note="XL gets the signal fill" dark={dark}>
                <SizeTag size="S" />
                <SizeTag size="M" />
                <SizeTag size="L" />
                <SizeTag size="XL" />
                <SizeTag size="M" estimated />
              </Swatch>

              <Swatch name="SizeTag large" note="publish + detail only" dark={dark}>
                <SizeTag size="L" large measurements="60 x 40 x 35 cm" />
                <SizeTag size="XL" large estimated measurements="Estimated" />
              </Swatch>

              <Swatch name="PriceSticker" note="detail + hero only, never on a card" dark={dark}>
                <PriceSticker amount={12} />
                <PriceSticker amount={45.2} unit="total" />
              </Swatch>
            </>
          )}
        </Section>

        {/* ── DoorCard ───────────────────────────────────────────────── */}
        <Section title="DoorCard" meta="signature · sec. 6.1">
          {(dark) => (
            <>
              <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
                <DoorCard
                  as="button"
                  title="Canon EOS R50 mirrorless camera"
                  category="Cameras"
                  photoUrl={DEMO_PHOTO}
                  alt="Canon EOS R50 camera body"
                  price={12}
                  size="M"
                  status="available"
                />
                <DoorCard
                  as="button"
                  title="DJI Mini 4K drone with controller"
                  category="Cameras"
                  photoUrl={DEMO_PHOTO}
                  alt="DJI Mini drone"
                  price={18}
                  size="S"
                  status="reserved"
                />
                <DoorCard
                  as="button"
                  title="Bosch rotary hammer drill"
                  category="Tools"
                  photoUrl={DEMO_PHOTO}
                  alt="Rotary hammer drill"
                  price={9.5}
                  size="XL"
                  estimated
                  status="ready"
                />
                <DoorCard
                  as="button"
                  title="4-person camping tent"
                  category="Camping"
                  photoUrl={DEMO_PHOTO}
                  alt="Camping tent"
                  price={15}
                  size="L"
                  status="unavailable"
                />
              </div>
              <p className={`text-small ${dark ? 'text-panel/60' : 'text-steel-600'}`}>
                Press one: it should sink 3px and its shadow shrink by the same amount.
              </p>
            </>
          )}
        </Section>

        {/* ── RentalTrack ────────────────────────────────────────────── */}
        <Section title="RentalTrack" meta="sec. 7.7">
          {(dark) => (
            <>
              <RentalTrack current={trackStep} className="w-full" />
              <Swatch name="Step" dark={dark}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={trackStep === i ? 'primary' : 'secondary'}
                    onClick={() => setTrackStep(i)}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </Button>
                ))}
              </Swatch>
            </>
          )}
        </Section>

        {/* ── SplitFlapCode ──────────────────────────────────────────── */}
        <Section title="SplitFlapCode" meta="the one orchestrated moment · sec. 6.2">
          {(dark) => (
            <>
              <SplitFlapCode key={flapKey} code="B4" label="Compartment" />
              <Swatch name="Replay" note="under 900ms, 60ms stagger" dark={dark}>
                <Button size="sm" variant="secondary" onClick={() => setFlapKey((k) => k + 1)}>
                  Play again
                </Button>
              </Swatch>
            </>
          )}
        </Section>

        {/* ── Overlays ───────────────────────────────────────────────── */}
        <Section title="Overlays" meta="sec. 7.8 + 7.9">
          {(dark) => (
            <>
              <Swatch name="Modal / BottomSheet" note="Esc closes, focus is trapped" dark={dark}>
                <Button variant="secondary" onClick={() => setModalOpen(true)}>
                  Open dialog
                </Button>
              </Swatch>

              <Swatch name="Toast" dark={dark}>
                <div className="flex w-full flex-col gap-2">
                  <Toast tone="success" message="Published. Your listing is live." onClose={() => {}} />
                  <Toast
                    tone="error"
                    message="No L lockers are free on those dates. Try other dates."
                    onClose={() => {}}
                  />
                  <Toast tone="info" message="Size estimated from the category." onClose={() => {}} />
                </div>
              </Swatch>

              <Swatch name="Toast viewport" dark={dark}>
                <Button size="sm" variant="secondary" onClick={() => setToastOpen(true)}>
                  Show pinned toast
                </Button>
              </Swatch>
            </>
          )}
        </Section>

        {/* ── Empty + loading ────────────────────────────────────────── */}
        <Section title="Empty and loading" meta="sec. 7.11 + 7.12">
          {() => (
            <>
              <EmptyState
                title="Nothing published yet"
                body="Publish your first item and start earning."
                action={
                  <Button variant="primary" icon={Plus}>
                    Publish an item
                  </Button>
                }
              />

              <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
                <Skeleton variant="door" count={4} />
              </div>

              <div className="flex w-full flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton variant="block" className="h-20 w-full" />
              </div>
            </>
          )}
        </Section>

        {/* ── ControlPanelNav ────────────────────────────────────────── */}
        <Section title="ControlPanelNav" meta="sec. 7.10 · not mounted yet">
          {(dark) => (
            <>
              <div className="w-full max-w-sm overflow-hidden rounded-door border-2 border-ink">
                <ControlPanelNav activeKey="explore" />
              </div>
              <p className={`text-small ${dark ? 'text-panel/60' : 'text-steel-600'}`}>
                Spec says five cells; the shipped bottom bar is two. Unresolved — see the component
                comment.
              </p>
            </>
          )}
        </Section>
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm drop-off"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Not yet
            </Button>
            <Button variant="signal" icon={LockKeyhole} onClick={() => setModalOpen(false)}>
              Open locker
            </Button>
          </div>
        }
      >
        <p className="text-body text-ink">
          Compartment B4 at Metrocentro will unlock for 90 seconds. Put the item in, close the door,
          and take a photo.
        </p>
        <div className="mt-4">
          <Input label="Note for the renter" placeholder="Charger is in the side pocket" />
        </div>
      </Modal>

      {toastOpen && (
        <ToastViewport>
          <Toast
            tone="success"
            message="Published. Your listing is live."
            onClose={() => setToastOpen(false)}
          />
        </ToastViewport>
      )}
    </div>
  )
}
