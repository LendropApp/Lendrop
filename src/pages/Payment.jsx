import { useState, useMemo } from "react";

// Business rates — adjust these if pricing rules change
const SERVICE_FEE_RATE = 0.1; // 10%
const DEPOSIT_RATE = 0.2125; // ~matches example ($17 on $80 subtotal)

export default function Payment() {
  // UI states: "idle" | "processing" | "success" | "error"
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Product info (static for now — will come from props / Supabase later)
  const product = {
    name: "Classic black blazer",
    image: "https://via.placeholder.com/300x300?text=Product",
  };

  // Rental fields
  const [pricePerDay, setPricePerDay] = useState("20");
  const [days, setDays] = useState("4");
  const [taxId, setTaxId] = useState("");

  // Card fields (used when entering a new card)
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  // Saved card — for now this lives only in memory (resets on page reload).
  // TODO: once Supabase + a payment provider (Stripe/Mercado Pago) are connected,
  // load this from the user's saved payment methods on mount, and on save,
  // store only the provider token + brand + last 4 digits — never the raw number.
  const [savedCard, setSavedCard] = useState(null);
  const [useSavedCard, setUseSavedCard] = useState(false);

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Auto-calculated amounts based on pricePerDay and days
  const { subtotal, serviceFee, deposit, total } = useMemo(() => {
    const price = parseFloat(pricePerDay) || 0;
    const numberOfDays = parseInt(days, 10) || 0;

    const subtotalAmount = price * numberOfDays;
    const serviceFeeAmount = subtotalAmount * SERVICE_FEE_RATE;
    const depositAmount = subtotalAmount * DEPOSIT_RATE;
    const totalAmount = subtotalAmount + serviceFeeAmount + depositAmount;

    return {
      subtotal: subtotalAmount,
      serviceFee: serviceFeeAmount,
      deposit: depositAmount,
      total: totalAmount,
    };
  }, [pricePerDay, days]);

  const formatCurrency = (value) =>
    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Formats "1234567812345678" -> "1234 5678 1234 5678"
  const formatCardNumber = (value) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 16);
    return digitsOnly.replace(/(.{4})/g, "$1 ").trim();
  };

  // Formats "1225" -> "12/25"
  const formatExpiryDate = (value) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4);
    if (digitsOnly.length <= 2) return digitsOnly;
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
  };

  const validateFields = () => {
    const errors = {};

    if (!cardholderName.trim()) {
      errors.cardholderName = "Enter the cardholder's name";
    }

    const cardDigits = cardNumber.replace(/\D/g, "");
    if (cardDigits.length !== 16) {
      errors.cardNumber = "Card number must have 16 digits";
    }

    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      errors.expiryDate = "Use MM/YY format";
    } else {
      const [month, year] = expiryDate.split("/").map(Number);
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;

      if (month < 1 || month > 12) {
        errors.expiryDate = "Invalid month";
      } else if (
        year < currentYear ||
        (year === currentYear && month < currentMonth)
      ) {
        errors.expiryDate = "Card is expired";
      }
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      errors.cvv = "CVV must be 3 or 4 digits";
    }

    return errors;
  };

  const handlePay = () => {
    // If paying with the saved card, skip the new-card validation entirely
    const errors = useSavedCard ? {} : validateFields();

    if (total <= 0) {
      errors.amount = "Enter a valid price and number of days";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setStatus("idle");
      return;
    }

    setStatus("processing");
    setErrorMessage("");

    // Placeholder for the real payment call.
    // In production this should go through a provider like Stripe,
    // PayPal, or Mercado Pago — never send raw card data to your own
    // backend/database. The provider returns a token/confirmation
    // instead, and that's what gets saved and processed here.
    setTimeout(() => {
      const paymentSucceeded = true; // simulated result

      if (paymentSucceeded) {
        // If the user asked to save a new card, "save" it (mocked for now)
        if (!useSavedCard && saveCard) {
          const cardDigits = cardNumber.replace(/\D/g, "");
          setSavedCard({
            brand: "Card", // a real integration would detect Visa/Mastercard/etc.
            lastFourDigits: cardDigits.slice(-4),
            cardholderName,
          });
        }
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage("Your card was declined. Please try another card.");
      }
    }, 2000);
  };

  const resetForNextPayment = () => {
    setStatus("idle");
    // If a card was just saved, default to using it next time
    if (savedCard) {
      setUseSavedCard(true);
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-linear-to-br from-violet-600 via-violet-500 to-indigo-600 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-4">
            ✓
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Payment confirmed
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            We charged {formatCurrency(total)} for {product.name}. A receipt
            has been sent to your account.
          </p>
          <button
            onClick={resetForNextPayment}
            className="text-violet-600 hover:text-violet-800 font-medium text-sm"
          >
            Back to payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-violet-600 via-violet-500 to-indigo-600 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 mb-6">
          Complete payment
        </h1>

        {/* Product + rental fields */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <div className="rounded-xl overflow-hidden bg-slate-100 aspect-square flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm font-medium text-slate-800 mt-2">
              {product.name}
            </p>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Price per day
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Rental days
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Tax ID (optional, for invoice)
              </label>
              <input
                type="text"
                placeholder="0000-000000-000-0"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100 mb-6" />

        {/* Rental summary */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-slate-500 mb-3">
            Rental summary
          </h2>
          <ul className="space-y-2">
            <li className="flex justify-between text-sm text-slate-700">
              <span>Rental subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </li>
            <li className="flex justify-between text-sm text-slate-700">
              <span>Service fee (10%)</span>
              <span className="font-medium">{formatCurrency(serviceFee)}</span>
            </li>
            <li className="flex justify-between text-sm text-slate-700">
              <span>Security deposit</span>
              <span className="font-medium">{formatCurrency(deposit)}</span>
            </li>
          </ul>
        </div>

        <div className="h-px bg-slate-100 mb-6" />

        /* Total to pay */
        <div className="mb-8">
          <p className="text-sm text-slate-500 mb-1">Total to pay</p>
          <p className="text-3xl font-bold text-violet-700">
            {formatCurrency(total)}
          </p>
          {fieldErrors.amount && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.amount}</p>
          )}
        </div>

        {/* Card section: saved card OR new card form */}
        {savedCard && useSavedCard ? (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-slate-500 mb-3">
              Card details
            </h2>
            <div className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-slate-800 font-medium">
                  {savedCard.brand} ***{savedCard.lastFourDigits}
                </p>
                <p className="text-xs text-slate-400">
                  {savedCard.cardholderName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseSavedCard(false)}
                className="text-sm text-violet-600 hover:text-violet-800 font-medium"
              >
                Use a different card
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-slate-500 mb-3">
              Card details
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">
                  Cardholder name
                </label>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                    fieldErrors.cardholderName
                      ? "border-red-400"
                      : "border-slate-200"
                  }`}
                />
                {fieldErrors.cardholderName && (
                  <p className="text-xs text-red-500 mt-1">
                    {fieldErrors.cardholderName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">
                  Card number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                    fieldErrors.cardNumber
                      ? "border-red-400"
                      : "border-slate-200"
                  }`}
                />
                {fieldErrors.cardNumber && (
                  <p className="text-xs text-red-500 mt-1">
                    {fieldErrors.cardNumber}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">
                    Expiry date
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) =>
                      setExpiryDate(formatExpiryDate(e.target.value))
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                      fieldErrors.expiryDate
                        ? "border-red-400"
                        : "border-slate-200"
                    }`}
                  />
                  {fieldErrors.expiryDate && (
                    <p className="text-xs text-red-500 mt-1">
                      {fieldErrors.expiryDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) =>
                      setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                      fieldErrors.cvv ? "border-red-400" : "border-slate-200"
                    }`}
                  />
                  {fieldErrors.cvv && (
                    <p className="text-xs text-red-500 mt-1">
                      {fieldErrors.cvv}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">
                  Billing address (optional)
                </label>
                <input
                  type="text"
                  placeholder="Street, city, country"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Save this card for future rentals
              </label>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {errorMessage}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={status === "processing"}
          className="w-full bg-violet-700 hover:bg-violet-800 disabled:bg-violet-400 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {status === "processing"
            ? "Processing..."
            : `Pay ${formatCurrency(total)}`}
        </button>

        {/* Security note */}
        <p className="text-xs text-slate-400 text-center mt-4">
           Secure, SSL-encrypted payment
        </p>
      </div>
    </div>
  );
}