import {
  CheckCircle2, ChevronRight, Clock, CreditCard,
  Gift, Shield, ShoppingCart, Truck, X, XCircle, Zap
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"

import kueskiPayLogo from "../../Kueski-Pay.webp"

type WidgetState = | "collapsed" | "expanded" | "verification" | "loading"
  | "approved" | "rejected"  | "simulator" | "confirmation" | "card" | "resume"
type LoadingIntent = "login" | "payment" | "card"

type InstallmentOption = {
  id_oferta: number
  monto_min?: number | string | null
  monto_max?: number | string | null
  quincenas: number
  quincenas_min?: number | null
  quincenas_max?: number | null
  tasa_interes: number | string
  fecha_vigencia?: string | null
}

type WidgetLoginResponse = {
  id_usuario: number
  kueski_user_id?: string | null
  nombre?: string | null
  email?: string | null
  telefono?: string | null
  id_credito: number
  credito_disponible?: number | string | null
  score_credito?: number | null
  fecha_actualizacion?: string | null
  installment_options: InstallmentOption[]
}

type WidgetPayment = {
  id_numero_pago?: number | null
  monto_pago?: number | string | null
  fecha_vencimiento?: string | null
  fecha_pago?: string | null
  estado?: string | null
}

type WidgetBurnerCard = {
  kueski_card_id?: string | null
  numero_tokenizado?: string | null
  fecha_expiracion?: string | null
  estado?: string | null
}

type WidgetCheckoutResponse = {
  id_transaccion: number
  id_sesion?: number | null
  id_oferta?: number | null
  nombre?: string | null
  email?: string | null
  monto_total?: number | string | null
  quincenas_seleccionadas?: number | null
  tasa_interes?: number | string | null
  estado?: string | null
  pagos: WidgetPayment[]
  burner_card?: WidgetBurnerCard | null
}

interface FloatingFinanceWidgetProps {
  productPrice: number
  productName?: string
  productDescription?: string
  originalPrice?: number | null
  discountPercent?: number | null
  rating?: number | null
  reviewCount?: number | null
}

type ShoppingComparison = {
  title?: string | null
  store?: string | null
  price: number
  display_price?: string | null
  link?: string | null
  thumbnail?: string | null
}

const API_BASE_URLS = [
  "http://127.0.0.1:8000/api/v1",
  "http://localhost:8000/api/v1"
]

const available_amount_of_installments = 12;
const fallbackInstallmentOptions = Array.from({ length: available_amount_of_installments }, (_, i) => i + 1)
const min_installments = 12;
const card_timer_seconds = 60;
const loading_timeout = 1200;

export function FloatingFinanceWidget({
  productPrice,
  productName = "Este producto",
  productDescription, originalPrice, discountPercent, rating, reviewCount
}: FloatingFinanceWidgetProps) {

  const [state, setState] = useState<WidgetState>("collapsed") // Estado del widget
  const [selectedInstallments, setSelectedInstallments] = useState(min_installments) // Quincenas seleccionadas
  const [userEmail, setUserEmail] = useState("") // Correo del usuario
  const [userPassword, setUserPassword] = useState("") //Contraseña
  const [cardTimerSeconds, setCardTimerSeconds] = useState(card_timer_seconds)
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([])
  const [loginError, setLoginError] = useState("No se encontró ningún usuario")
  const [loginData, setLoginData] = useState<WidgetLoginResponse | null>(null)
  const [checkoutData, setCheckoutData] = useState<WidgetCheckoutResponse | null>(null)
  const [checkoutError, setCheckoutError] = useState("")
  const [loadingIntent, setLoadingIntent] = useState<LoadingIntent>("login")
  const [shoppingComparisons, setShoppingComparisons] = useState<ShoppingComparison[]>([])
  const [isLoadingComparisons, setIsLoadingComparisons] = useState(false)
  const [comparisonError, setComparisonError] = useState("")

  const selectedInstallmentOption = installmentOptions.find(
    (option) => option.quincenas === selectedInstallments
  )
  const interest = Number(selectedInstallmentOption?.tasa_interes ?? 0.025)
  const availableInstallments = installmentOptions.length
    ? installmentOptions.map((option) => option.quincenas)
    : fallbackInstallmentOptions

  const hasInterest = interest > 0; 
  const totalWithInterest = hasInterest ? Math.ceil(productPrice * (1 + interest)) : productPrice;
  const paymentPerInstallment = Math.ceil(totalWithInterest / selectedInstallments);
  const minimumInstallments = availableInstallments.at(-1) ?? available_amount_of_installments
  const minimumPayment = Math.ceil(totalWithInterest / minimumInstallments);

  const interestPercent = hasInterest ? interest * 100 : 0;
  const paidPayments = checkoutData?.pagos.filter((payment) => payment.estado === "PAID").length ?? 0
  const overduePayments = checkoutData?.pagos.filter((payment) => payment.estado === "OVERDUE").length ?? 0
  const pendingPayments = checkoutData?.pagos.filter((payment) => payment.estado === "PENDING").length ?? 0
  const computedDiscountPercent = discountPercent ?? (
    originalPrice && originalPrice > productPrice
      ? Math.round(((originalPrice - productPrice) / originalPrice) * 100)
      : null
  )

  const starCount = rating ? Math.max(1, Math.min(5, Math.round(rating))) : 0
  const filteredShoppingComparisons = useMemo(
    () => shoppingComparisons.filter((item) => !isCurrentStoreResult(item.store)),
    [shoppingComparisons]
  )
  const shoppingPriceStats = useMemo(
    () => getPriceStats([productPrice, ...filteredShoppingComparisons.map((item) => item.price)]),
    [filteredShoppingComparisons, productPrice]
  )

  useEffect(() => {
    if (state !== "expanded" || !productName) {
      return
    }

    let isMounted = true

    const loadShoppingComparisons = async () => {
      setIsLoadingComparisons(true)
      setComparisonError("")

      try {
        const query = encodeURIComponent(productName)
        let response: Response | null = null
        let lastConnectionError: unknown = null

        for (const baseUrl of API_BASE_URLS) {
          try {
            response = await fetch(
              `${baseUrl}/shopping/compare?product_name=${query}`
            )
            break
          } catch (error) {
            lastConnectionError = error
          }
        }

        if (!response) {
          console.error("WidKueski shopping API connection failed", lastConnectionError)
          throw lastConnectionError
        }

        if (!response.ok) {
          throw new Error("No se pudieron consultar precios")
        }

        const data = await response.json()

        if (isMounted) {
          setShoppingComparisons(data.results ?? [])
        }
      } catch {
        if (isMounted) {
          setShoppingComparisons([])
          setComparisonError("No se pudieron cargar precios comparativos")
        }
      } finally {
        if (isMounted) {
          setIsLoadingComparisons(false)
        }
      }
    }

    loadShoppingComparisons()

    return () => {
      isMounted = false
    }
  }, [state, productName])

  const handleLogin = async () => {
    setLoginData(null)
    setCheckoutData(null)
    setCheckoutError("")
    setLoadingIntent("login")
    setState("loading")

    try {
      const loginPayload = {
        email: userEmail.trim(),
        password: userPassword.trim(),
        monto_compra: productPrice
      }

      let response: Response | null = null
      let lastConnectionError: unknown = null

      for (const baseUrl of API_BASE_URLS) {
        try {
          response = await fetch(`${baseUrl}/widget/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(loginPayload)
          })
          break
        } catch (error) {
          lastConnectionError = error
        }
      }

      if (!response) {
        console.error("WidKueski API connection failed", lastConnectionError)
        throw lastConnectionError
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        setLoginError(errorData?.detail ?? "No se encontró ningún usuario")
        window.setTimeout(() => setState("rejected"), loading_timeout)
        return
      }

      const data = (await response.json()) as WidgetLoginResponse
      const nextOptions = data.installment_options ?? []

      if (!nextOptions.length) {
        setLoginError("Este usuario no tiene quincenas disponibles")
        window.setTimeout(() => setState("rejected"), loading_timeout)
        return
      }

      setLoginData(data)
      setInstallmentOptions(nextOptions)
      setSelectedInstallments(nextOptions[0].quincenas)
      setCheckoutData(null)
      setCheckoutError("")
      setLoginError("")
      window.setTimeout(() => setState("approved"), loading_timeout)
    } catch {
      setLoginError("No se pudo conectar con el servidor")
      window.setTimeout(() => setState("rejected"), loading_timeout)
    }
  }

  const handleCheckout = (nextState: "resume" | "card") => {
    setCheckoutError("")
    setLoadingIntent(nextState === "card" ? "card" : "payment")

    const now = new Date()
    const userId = loginData?.id_usuario ?? 0
    const expirationDate = new Date(now)
    expirationDate.setDate(expirationDate.getDate() + 1)

    const pagos = Array.from({ length: selectedInstallments }).map((_, idx) => {
      const dueDate = new Date(now)
      dueDate.setDate(dueDate.getDate() + (idx + 1) * 15)

      return {
        id_numero_pago: idx + 1,
        monto_pago: paymentPerInstallment,
        fecha_vencimiento: dueDate.toISOString(),
        fecha_pago: null,
        estado: "PENDING"
      }
    })

    setCheckoutData({
      id_transaccion: Date.now(),
      id_sesion: null,
      id_oferta: selectedInstallmentOption?.id_oferta ?? null,
      nombre: loginData?.nombre ?? "NOMBRE USUARIO",
      email: loginData?.email ?? userEmail,
      monto_total: totalWithInterest,
      quincenas_seleccionadas: selectedInstallments,
      tasa_interes: interest,
      estado: "SIMULATED",
      pagos,
      burner_card: {
        kueski_card_id: `vcard_mock_${userId}`,
        numero_tokenizado: getMockCardNumber(userId),
        fecha_expiracion: expirationDate.toISOString(),
        estado: "ACTIVE"
      }
    })
    setState("loading")
    window.setTimeout(() => setState(nextState), loading_timeout)
  }

  const paymentDates = useMemo(() =>
    checkoutData?.pagos?.length
      ? checkoutData.pagos.map((payment, idx) => {
          const date = payment.fecha_vencimiento
            ? new Date(payment.fecha_vencimiento)
            : new Date()
          if (!payment.fecha_vencimiento) {
            date.setDate(date.getDate() + (idx + 1) * 15)
          }
          return {
            amount: Number(payment.monto_pago ?? paymentPerInstallment),
            date: date.toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short"
            }),
            index: payment.id_numero_pago ?? idx + 1,
            status: payment.estado
          }
        })
      : Array.from({ length: Math.min(selectedInstallments, min_installments) }).map((_, idx) => {
      const date = new Date()
      date.setDate(date.getDate() + (idx + 1) * 15)
      return {
        amount: paymentPerInstallment,
        date: date.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short"
        }),
        index: idx + 1,
        status: "PENDING"
      }
    }),
    [checkoutData?.pagos, paymentPerInstallment, selectedInstallments])

  useEffect(() => {
    if (state !== "card") {
      setCardTimerSeconds(card_timer_seconds)
      return
    }

    setCardTimerSeconds(card_timer_seconds)

    const intervalId = window.setInterval(() => {
      setCardTimerSeconds((currentSeconds) => Math.max(currentSeconds - 1, 0))
    }, 1000)

    const timeoutId = window.setTimeout(() => {
      setState("simulator")
    }, card_timer_seconds * 1000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [state])

  const cardTimerLabel = `${Math.floor(cardTimerSeconds / 60)}:${String(
    cardTimerSeconds % 60
  ).padStart(2, "0")}`

  // Regresa el widget al estado inicial.
  const handleStartOver = () => {
    setState("collapsed")
    setUserEmail("")
    setUserPassword("")
    setInstallmentOptions([])
    setLoginData(null)
    setCheckoutData(null)
    setCheckoutError("")
    setSelectedInstallments(min_installments)
    setLoginError("No se encontró ningún usuario")
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
                    <img src={kueskiPayLogo} alt="" aria-hidden="true" />
                  </div>
                  <div>
                    <h2>Kueski Pay</h2>
                    <p>Compra ahora, paga después</p>
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
                    <div className="wk-comparison">
                      <div className="wk-comparisonHeader">
                        <span>Comparación de precios</span>
                        <small>Google Shopping</small>
                      </div>

                      {isLoadingComparisons && (
                        <p className="wk-comparisonEmpty">Buscando precios...</p>
                      )}

                      {!isLoadingComparisons && comparisonError && (
                        <p className="wk-comparisonEmpty">{comparisonError}</p>
                      )}

                      {!isLoadingComparisons && !comparisonError && filteredShoppingComparisons.length === 0 && (
                        <p className="wk-comparisonEmpty">No encontramos precios similares</p>
                      )}

                      {!isLoadingComparisons && filteredShoppingComparisons.length > 0 && (
                        <div className="wk-comparisonList">
                          {shoppingPriceStats && (
                            <div className="wk-priceStats" aria-label="Resumen histórico de precios">
                              <div>
                                <span>Mín. histórico</span>
                                <b>{formatCurrency(shoppingPriceStats.min)}</b>
                              </div>
                              <div>
                                <span>Promedio</span>
                                <b>{formatCurrency(shoppingPriceStats.average)}</b>
                              </div>
                              <div>
                                <span>Máx. histórico</span>
                                <b>{formatCurrency(shoppingPriceStats.max)}</b>
                              </div>
                            </div>
                          )}
                          <div className="wk-comparisonRow wk-currentStore">
                            <span>Precio actual</span>
                            <b>${productPrice.toLocaleString("es-MX")}</b>
                          </div>
                          {filteredShoppingComparisons.slice(0, 5).map((item, index) => (
                            <a
                              className={`wk-comparisonRow ${getComparisonToneClass(item.price, productPrice)}`}
                              href={item.link ?? undefined}
                              key={`${item.store ?? "store"}-${item.title ?? index}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <span>{item.store ?? "Tienda"}</span>
                              <b>{formatCurrency(item.price)}</b>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="wk-benefitGrid">
                      <BenefitCard icon={<Shield size={22} />} text="Sin tarjeta de crédito" />
                      <BenefitCard icon={<Zap size={22} />} text="Aprobación instantánea" />
                      <BenefitCard icon={<CheckCircle2 size={22} />} text="100% digital" />
                      <BenefitCard icon={<Gift size={22} />} text="Reembolso disponible" />
                    </div>
                    <button className="wk-primary" type="button" onClick={() => setState("verification")}>
                      <ShoppingCart size={24} />
                      Ver opciones de pago
                    </button>

                    <p className="wk-note">Sin pago inicial · 0% de interés si liquidas antes de la 7.ª quincena</p>
                  </motion.div>
                )}

                {state === "verification" && (
                  <motion.div className="wk-stack" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
                    <h3 className="wk-sectionTitle">
                      Inicia sesión
                    </h3>

                    <div className="wk-receipt">
                        <label className="wk-field">
                        <span>Correo electrónico:</span>
                        <input
                          type="email"
                          placeholder="tu@email.com"
                          value={userEmail}
                          onChange={(event) => setUserEmail(event.target.value)}
                        />
                        </label>
                        <label className="wk-field">
                          <span>Contraseña:</span>
                          <input
                            type="password"
                            placeholder="Ingresa tu contraseña"
                            value={userPassword}
                            onChange={(event) => setUserPassword(event.target.value)}
                          />
                        </label>
                        <a
                          className="wk-accountLink"
                          href="https://accounts.kueski.com/u/login?state=hKFo2SBYRjFMZXJjZEFQNDkySWJtLTAzbTRmbWljN2ZDOWZIMqFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIDhYUy1EcUFabnB2MXQ0eF9xcEp4YnFBcWRiNEgtWDMyo2NpZNkgbkpiYnpvSmtqRDBsSThRRFhyMzZtYUJUT0lpNmVRek0"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Crear cuenta de Kueski
                        </a>
                    </div>

                    
                    

                    <div className="wk-actions">
                      <button className="wk-secondary" type="button" onClick={() => setState("expanded")}>
                        Regresar
                      </button>
                      <button
                        className="wk-primary"
                        type="button"
                        disabled={!userEmail.trim() || !userPassword}
                        onClick={handleLogin}
                      >
                        Iniciar sesión
                      </button>
                    </div> 

                  </motion.div>
                )}

                {state === "simulator" && (
                  <motion.div className="wk-stack" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>

                    <h3 className="wk-sectionTitle">
                      Selecciona en cuántas quincenas quieres pagar:
                    </h3>
                    <div className="wk-receipt">
                      <p>Oferta disponible</p>
                      <Row
                        label="Quincenas:"
                        value={`1 a ${selectedInstallmentOption?.quincenas_max ?? availableInstallments.at(-1)} pagos`}
                      />
                      <Row
                        label="Tasa:"
                        value={`${interestPercent.toFixed(1)}%`}
                      />
                      <Row
                        label="Monto oferta:"
                        value={`${formatCurrency(selectedInstallmentOption?.monto_min)} - ${formatCurrency(selectedInstallmentOption?.monto_max)}`}
                      />
                      <Row
                        label="Vigencia:"
                        value={formatDate(selectedInstallmentOption?.fecha_vigencia)}
                      />
                      <Row
                        label="Crédito:"
                        value={formatCurrency(loginData?.credito_disponible)}
                      />
                    </div>
                    <div className="wk-installments">
                      {availableInstallments.map((num) => (
                        <button
                          key={num}
                          className={selectedInstallments === num ? "wk-installment wk-selected" : "wk-installment"}
                          type="button"
                          onClick={() => {
                            setSelectedInstallments(num)
                            setCheckoutData(null)
                            setCheckoutError("")
                          }}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                     <div className="wk-summary">
                      <p>Pagarás por quincena</p>
                      <strong>
                        $
                        {Math.ceil(paymentPerInstallment).toLocaleString(
                          "es-MX"
                        )}
                      </strong>
                      <dl>
                        <div>
                          <dt>Número de pagos:</dt>
                          <dd>{selectedInstallments} quincenas</dd>
                        </div>
                        <div>
                          <dt>Interés:</dt>

                        <dd>
                            {!hasInterest
                              ? "0% (sin intereses)"
                              : `${interestPercent.toFixed(0)}%`}
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

                    <div className="wk-actions">
                      <button className="wk-secondary" type="button" onClick={() => setState("expanded")}>
                        Atrás
                      </button>
                      <button
                        className="wk-primary"
                        type="button"
                        onClick={() => setState("confirmation")}
                      >
                        Seleccionar plan de pago
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
                    <h3>{getLoadingTitle(loadingIntent)}</h3>
                    <p>{getLoadingText(loadingIntent)}</p>
                  </motion.div>
                )}

                {state === "approved" && (
                  <ResultState
                    tone="success"
                    icon={<CheckCircle2 size={58} />}
                    title="¡Bienvenido!"
                    text="Has iniciado sesión correctamente">
                    <div className="wk-receipt">
                      <p>Perfil Kueski</p>
                      <Row label="Usuario:" value={loginData?.nombre ?? "Usuario"} />
                      <Row label="Correo:" value={loginData?.email ?? userEmail} />
                      <Row label="Crédito disponible:" value={formatCurrency(loginData?.credito_disponible)} />
                      <Row label="Score:" value={loginData?.score_credito?.toString() ?? "Sin dato"} />
                      <Row label="Actualizado:" value={formatDate(loginData?.fecha_actualizacion)} />
                    </div>
                    <button
                      className="wk-primary"
                      type="button"
                      onClick={() => setState("simulator")}>
                      Visualizar planes de pago
                    </button>
                    <button
                      className="wk-secondary wk-returnButton"
                      type="button"
                      onClick={() => setState("verification")}>
                      Regresar
                    </button>
                  </ResultState>
                )}

                {state === "rejected" && (
                  <ResultState
                    tone="danger"
                    icon={<XCircle size={58} />}
                    title="No se encontró ningún usuario"
                    text="Intenta con otro correo o nuevamente más tarde"
                  >
                    {loginError && <p className="wk-note">{loginError}</p>}
                    <button
                      className="wk-secondary" type="button" 
                      onClick={() => setState("verification")}>Regresar</button>
                  </ResultState>
                )}

                {state === "confirmation" && ( 
                  <motion.div className="wk-stack" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
                    <h3 className="wk-sectionTitle wk-underlinedTitle">Previo a continuar, revisa toda la información:</h3>

                    <div className="wk-receipt">
                      <p>Confirmación de plan de pagos</p>
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
                      <Row label="Usuario:" value={loginData?.nombre ?? "Usuario"} />
                      <Row label="Correo:" value={loginData?.email ?? userEmail} />
                      <Row label="ID oferta:" value={`${selectedInstallmentOption?.id_oferta ?? "N/A"}`} />
                      <Row label="Tasa aplicada:" value={`${interestPercent.toFixed(1)}%`} />
                      <Row label="Estado:" value={checkoutData?.estado ?? "SIMULATED"} />
                    </div>
                    <button
                      className="wk-primary"
                      type="button"
                      onClick={() => handleCheckout("resume")}>
                      Pagar con Widkueski
                    </button>
                    <button
                      className="wk-primary"
                      type="button"
                      onClick={() => handleCheckout("card")}>
                      Utilizar tarjeta digital
                    </button>
                    {checkoutError && <p className="wk-note">{checkoutError}</p>}
                    <button
                      className="wk-secondary wk-returnButton"
                      type="button"
                      onClick={() => setState("simulator")}>
                      Regresar
                    </button>
                  </motion.div>
                )}

                {state === "card" && ( 
                  <motion.div className="wk-stack" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>

                    <h3 className="wk-sectionTitle wk-underlinedTitle">Copia y pega los datos de la tarjeta digital para pagar</h3>

                    <div className="wk-card" aria-label="Tarjeta digital Kueski">
                      <div className="wk-cardHeader">
                        <span>Tarjeta digital</span>
                        <strong>kueski</strong>
                      </div>
                      <div className="wk-cardNumber">
                        {(checkoutData?.burner_card?.numero_tokenizado ?? "1234 4568 1234 4568")
                          .split(/[\s-]+/)
                          .map((part) => (
                            <span key={part}>{part}</span>
                          ))}
                      </div>
                      <div className="wk-cardDetails">
                        <span>{checkoutData?.burner_card?.estado ?? "SIMULATED"}</span>
                      </div>
                      <p>{checkoutData?.nombre ?? "NOMBRE USUARIO"}</p>
                    </div>
                    <div className="wk-receipt">
                      <p>Datos de tarjeta</p>
                      <Row label="ID:" value={checkoutData?.burner_card?.kueski_card_id ?? "Tarjeta simulada"} />
                      <Row label="Estado:" value={checkoutData?.burner_card?.estado ?? "SIMULATED"} />
                      <Row label="Expira:" value={formatDate(checkoutData?.burner_card?.fecha_expiracion)} />
                    </div>

                    <div className="wk-cardTimer" aria-live="polite">
                      <motion.span
                        className="wk-cardTimerIcon"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear"
                        }}>
                        <Clock size={24} />
                      </motion.span>
                      <span>{cardTimerLabel}</span>
                    </div>
  
                    <button
                      className="wk-secondary wk-returnButton"
                      type="button"
                      onClick={() => setState("simulator")}>
                      Regresar
                    </button>
                  </motion.div>
                )}

                {state === "resume" && (
                  <ResultState
                    tone="success"
                    icon={<CheckCircle2 size={58} />}
                    title="¡Compra confirmada!"
                    text="Recibirás un correo con los detalles de tu financiamiento">
                    <div className="wk-metricGrid">
                      <div>
                        <span>Pagados</span>
                        <b>{paidPayments}</b>
                      </div>
                      <div>
                        <span>Pendientes</span>
                        <b>{pendingPayments}</b>
                      </div>
                      <div>
                        <span>Atrasados</span>
                        <b>{overduePayments}</b>
                      </div>
                    </div>
                    <div className="wk-summary wk-calendar">
                      <p style={{color: "#fff"}}>Tu calendario de pagos</p>
                      {paymentDates.slice(0, 4).map((payment) => (
                        <div className="wk-calendarRow" key={`${payment.index}-${payment.date}`}>
                          <span>
                            Pago {payment.index}
                            <small className={`wk-status wk-status-${String(payment.status).toLowerCase()}`}>
                              {getPaymentStatusLabel(payment.status)}
                            </small>
                          </span>
                          <b>
                            $
                            {Math.ceil(payment.amount).toLocaleString(
                              "es-MX"
                            )}
                          </b>
                          <em>{payment.date}</em>
                        </div>
                      ))}
                      {selectedInstallments > 4 && (
                        <small>+{selectedInstallments - 4} pagos más</small>
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

function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "Sin dato"
  }

  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return "Sin dato"
  }

  return `$${numericValue.toLocaleString("es-MX", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}`
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Sin dato"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Sin dato"
  }

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })
}

function getPaymentStatusLabel(status?: string | null) {
  if (status === "PAID") {
    return "Pagado"
  }

  if (status === "OVERDUE") {
    return "Atrasado"
  }

  return "Pendiente"
}

function getLoadingTitle(intent: LoadingIntent) {
  if (intent === "payment") {
    return "Procesando pago..."
  }

  if (intent === "card") {
    return "Generando tarjeta..."
  }

  return "Iniciando sesión..."
}

function getLoadingText(intent: LoadingIntent) {
  if (intent === "payment") {
    return "Estamos confirmando tu compra"
  }

  if (intent === "card") {
    return "Preparando tu tarjeta digital"
  }

  return "Esto solo tomará unos segundos"
}

function getMockCardNumber(userId: number) {
  const suffix = String(1000 + userId).slice(-4)
  return `4152 7391 0846 ${suffix}`
}

function getComparisonToneClass(price: number, currentPrice: number) {
  if (price > currentPrice) {
    return "wk-comparisonHigher"
  }

  if (price < currentPrice) {
    return "wk-comparisonLower"
  }

  return "wk-comparisonSame"
}

function getPriceStats(prices: number[]) {
  const validPrices = prices.filter((price) => Number.isFinite(price) && price > 0)

  if (!validPrices.length) {
    return null
  }

  const total = validPrices.reduce((sum, price) => sum + price, 0)

  return {
    average: total / validPrices.length,
    max: Math.max(...validPrices),
    min: Math.min(...validPrices)
  }
}

function isCurrentStoreResult(store?: string | null) {
  if (!store || typeof location === "undefined") {
    return false
  }

  const hostname = location.hostname.toLowerCase()
  const normalizedStore = store.toLowerCase()
  const currentStoreNames = [
    { host: "amazon.", names: ["amazon"] },
    { host: "liverpool.com.mx", names: ["liverpool"] },
    { host: "zara.", names: ["zara"] },
    { host: "walmart.", names: ["walmart"] },
    { host: "mercadolibre.", names: ["mercado libre", "mercadolibre"] }
  ]

  const currentStore = currentStoreNames.find((storeInfo) =>
    hostname.includes(storeInfo.host)
  )

  return currentStore
    ? currentStore.names.some((name) => normalizedStore.includes(name))
    : false
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
