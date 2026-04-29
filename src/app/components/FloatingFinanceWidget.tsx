import {
  CheckCircle2, ChevronRight, Clock, CreditCard,
  Gift, Shield, ShoppingCart, Truck, X, XCircle, Zap
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"
import { useMemo, useState } from "react"

type WidgetState = | "collapsed" | "expanded" | "simulator" | "loading"
  | "approved" | "rejected" | "confirmation"

interface FloatingFinanceWidgetProps {
  productPrice: number
  productName?: string
  productDescription?: string
  originalPrice?: number | null
  discountPercent?: number | null
  rating?: number | null
  reviewCount?: number | null
}

const availble_amount_of_installments = 12;
const installmentOptions = Array.from({ length: availble_amount_of_installments }, (_, i) => i + 1)
const min_stallments = 12;
const random_ratio = 0.2;
const timeout_for_loading = 1200;

export function FloatingFinanceWidget({
  productPrice,
  productName = "Este producto",
  productDescription, originalPrice, discountPercent, rating, reviewCount
}: FloatingFinanceWidgetProps) {

  const [state, setState] = useState<WidgetState>("collapsed") // Estado del widget <- no shit
  const [selectedInstallments, setSelectedInstallments] = useState(min_stallments) // Cuántas quincenas eligió <- for real?
  const [userEmail, setUserEmail] = useState("") // Email del usuario <- are you sure?...

  const interestRate = selectedInstallments > 6 ? 0.15 : 0 // Interest rate increase after 5 stallments 
  const totalWithInterest = Math.ceil(productPrice * (1 + interestRate))
  const paymentPerInstallment = totalWithInterest / selectedInstallments
  const minimumPayment = Math.ceil((productPrice * (1 + interestRate)) / availble_amount_of_installments) 

  const computedDiscountPercent = discountPercent ?? (
    originalPrice && originalPrice > productPrice
      ? Math.round(((originalPrice - productPrice) / originalPrice) * 100)
      : null
  )

  const starCount = rating ? Math.max(1, Math.min(5, Math.round(rating))) : 0

  // Simulate eligibility verification, for debugging
  const simulate_check_eligibility = () => {
    setState("loading")
    window.setTimeout(() => {
      setState(Math.random() > random_ratio ? "approved" : "rejected")
    }, timeout_for_loading)
  }

  const paymentDates = useMemo(() =>
    Array.from({ length: Math.min(selectedInstallments, min_stallments) }).map((_, idx) => {
      const date = new Date()
      date.setDate(date.getDate() + (idx + 1) * 15)
      return date.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short"
      })
    }),
    [selectedInstallments])

  // Returns the widget to the inital state
  const handleStartOver = () => {
    setState("collapsed")
    setUserEmail("")
  }

  return (
    <div className="wk-root" aria-live="polite">
      <AnimatePresence>
        {state === "collapsed" && (
          <motion.button
            className="wk-launcher"
            type="button"
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 18 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setState("expanded")}
          >
            <CreditCard size={28} strokeWidth={2.4} />
            <span>
              <strong>Paga desde</strong>
              <b>${minimumPayment.toLocaleString("es-MX")} / quincena</b>
            </span>
            <ChevronRight size={26} strokeWidth={2.7} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state !== "collapsed" && (
          <>
            <motion.button
              className="wk-scrim"
              type="button"
              aria-label="Cerrar Kueski Pay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setState("collapsed")}
            />

            <motion.section
              className="wk-panel"
              role="dialog"
              aria-label="Kueski Pay"
              initial={{ opacity: 0, scale: 0.95, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 28 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
            >

              <header className="wk-header">
                <div className="wk-brand">
                  <div className="wk-brandIcon">
                    <CreditCard size={30} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2>Kueski Pay</h2>
                    <p>Compra ahora, paga despues</p>
                  </div>
                </div>

                <button
                  className="wk-iconButton"
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => setState("collapsed")}
                >
                  <X size={28} />
                </button>
              </header>

              <div className="wk-body">

                {state === "expanded" && (
                  <motion.div className="wk-stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                    <div className="wk-product">
                      {(rating || reviewCount) && (
                        <div className="wk-rating">
                          {rating && <span>{"★".repeat(starCount)}</span>}
                          {reviewCount && (
                            <em>({reviewCount.toLocaleString("es-MX")} reseñas)</em>
                          )}
                        </div>
                      )}
                      <h3>{productName}</h3>
                      {productDescription && <p>{productDescription}</p>}

                      <div className="wk-priceRow">
                        <strong>${productPrice.toLocaleString("es-MX")}</strong>

                        {originalPrice && originalPrice > productPrice && (
                          <s>${originalPrice.toLocaleString("es-MX")}</s>
                        )}

                        {computedDiscountPercent && computedDiscountPercent > 0 && (
                          <mark>-{computedDiscountPercent}%</mark>
                        )}
                      </div>

                      <div className="wk-kueskiLine">
                        <CreditCard size={22} />
                        O desde ${minimumPayment.toLocaleString("es-MX")} quincenales con Kueski
                      </div>
                    </div>
                    <div className="wk-perks">
                      <Perk icon={<Truck size={24} />} title="Envio gratis" text="Llega mañana" />
                      <Perk icon={<Shield size={24} />} title="Garantia extendida" text="2 años" />
                    </div>
                    <div className="wk-benefitGrid">
                      <BenefitCard icon={<Shield size={22} />} text="Sin tarjeta de credito" />
                      <BenefitCard icon={<Zap size={22} />} text="Aprobacion instantanea" />
                      <BenefitCard icon={<CheckCircle2 size={22} />} text="100% digital" />
                      <BenefitCard icon={<Gift size={22} />} text="Cashback disponible" />
                    </div>
                    <button className="wk-primary" type="button" onClick={() => setState("simulator")}>
                      <ShoppingCart size={24} />
                      Ver opciones de pago
                    </button>

                    <p className="wk-note">Sin pago inicial · Intereses desde 0%</p>
                  </motion.div>
                )}

                {state === "simulator" && (
                  <motion.div className="wk-stack" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>

                    <h3 className="wk-sectionTitle">
                      Selecciona la cantidad de quincenas de tu preferencia a pagar:
                    </h3>
                    <div className="wk-installments">
                      {installmentOptions.map((num) => (
                        <button
                          key={num}
                          className={selectedInstallments === num ? "wk-installment wk-selected" : "wk-installment"}
                          type="button"
                          onClick={() => setSelectedInstallments(num)}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                     <div className="wk-summary">
                      <p>Pagaras por quincena</p>
                      <strong>
                        $
                        {Math.ceil(paymentPerInstallment).toLocaleString(
                          "es-MX"
                        )}
                      </strong>
                      <dl>
                        <div>
                          <dt>Numero de pagos:</dt>
                          <dd>{selectedInstallments} quincenas</dd>
                        </div>
                        <div>
                          <dt>Interes:</dt>
                          <dd>
                            {interestRate === 0
                              ? "0% (Sin intereses)"
                              : `${(interestRate * 100).toFixed(0)}%`}
                          </dd>
                        </div>
                        <div>
                          <dt>Total a pagar:</dt>
                          <dd>
                            $
                            {Math.ceil(totalWithInterest).toLocaleString(
                              "es-MX"
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <label className="wk-field">
                      <span>Correo electronico</span>
                      <input
                        type="email"
                        placeholder="tu@email.com"
                        value={userEmail}
                        onChange={(event) => setUserEmail(event.target.value)}
                      />
                    </label>

                    <div className="wk-actions">
                      <button className="wk-secondary" type="button" onClick={() => setState("expanded")}>
                        Atras
                      </button>
                      <button
                        className="wk-primary"
                        type="button"
                        disabled={!userEmail}
                        onClick={simulate_check_eligibility}
                      >
                        Verificar elegibilidad
                      </button>
                    </div>
                  </motion.div>
                )}

                 {state === "loading" && (
                  <motion.div
                    className="wk-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}>
                    <motion.div
                      className="wk-spinner"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear"
                      }}>
                      <Clock size={64} />
                    </motion.div>
                    <h3>Verificando tu elegibilidad...</h3>
                    <p>Esto solo tomara unos segundos</p>
                  </motion.div>
                )}

                {state === "approved" && (
                  <ResultState
                    tone="success"
                    icon={<CheckCircle2 size={58} />}
                    title="Aprobado!"
                    text="Tu credito ha sido pre-aprobado">
                    <div className="wk-receipt">
                      <p>Resumen de tu compra</p>
                      <Row label="Producto:" value={productName} />
                      <Row
                        label="Plan de pago:"
                        value={`${selectedInstallments} quincenas`}
                      />
                      <Row
                        label="Pago quincenal:"
                        value={`$${Math.ceil(
                          paymentPerInstallment
                        ).toLocaleString("es-MX")}`}
                      />
                    </div>
                    <button
                      className="wk-primary"
                      type="button"
                      onClick={() => setState("confirmation")}>
                      Confirmar compra con Kueski
                    </button>
                    <button
                      className="wk-linkButton"
                      type="button"
                      onClick={() => setState("simulator")}>
                      Modificar plan
                    </button>
                  </ResultState>
                )}

                {state === "rejected" && (
                  <ResultState
                    tone="danger"
                    icon={<XCircle size={58} />}
                    title="No aprobado"
                    text="Intenta despues"
                  >
                    <button
className="wk-secondary" type="button" 
                      onClick={handleStartOver}>Cerrar</button>
                  </ResultState>
                )}

                {state === "confirmation" && (
                  <ResultState
                    tone="success"
                    icon={<CheckCircle2 size={58} />}
                    title="Compra confirmada!"
                    text="Recibiras un correo con los detalles de tu financiamiento">
                    <div className="wk-summary wk-calendar">
                      <p style={{color: "#fff"}}>Tu calendario de pagos</p>
                      {paymentDates.slice(0, 4).map((date, idx) => (
                        <div className="wk-calendarRow" key={date}>
                          <span>Pago {idx + 1}</span>
                          <b>
                            $
                            {Math.ceil(paymentPerInstallment).toLocaleString(
                              "es-MX"
                            )}
                          </b>
                          <em>{date}</em>
                        </div>
                      ))}
                      {selectedInstallments > 4 && (
                        <small>+{selectedInstallments - 4} pagos mas</small>
                      )}
                    </div>
                    <button
                      className="wk-primary"
                      type="button"
                      onClick={handleStartOver}>
                      Cerrar
                    </button>
                  </ResultState>
                )}
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function BenefitCard({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="wk-benefit">
      {icon}
      <span>{text}</span>
    </div>
  )
}

function Perk({ icon, title, text }: {
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <div className="wk-perk">
      {icon}
      <span>
        <strong>{title}</strong> - {text}
      </span>
    </div>
  )
}


function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="wk-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}


function ResultState({ children, icon, text, title, tone }: {
  children: ReactNode
  icon: ReactNode
  text: string
  title: string
  tone: "danger" | "success"
}) {
  return (
    <motion.div className="wk-state">
      <div className={`wk-resultIcon wk-${tone}`}>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </motion.div>
  )
}
