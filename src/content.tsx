import "./styles/index.css"
import cssText from "data-text:./styles/index.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"

import { FloatingFinanceWidget } from "./app/components/FloatingFinanceWidget"


// Plasmo config
export const config: PlasmoCSConfig = {
  matches: ["https://*/*"]
}
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

type ProductInfo = {
  description?: string
  discountPercent?: number | null
  name: string
  originalPrice?: number | null
  price: number
  rating?: number | null
  reviewCount?: number | null
}

const refresh_product_timeout = 250;

// Main implementation
export default function ContentWidget() {
  const [product, setProduct] = useState<ProductInfo | null>(() =>
    detectSingleProduct()
  )

  useEffect(() => {
    let timeoutId: number | undefined

    const refreshProduct = () => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        const nextProduct = detectSingleProduct()

        setProduct((currentProduct) => {
          if (
            currentProduct?.name === nextProduct?.name &&
            currentProduct?.price === nextProduct?.price &&
            currentProduct?.originalPrice === nextProduct?.originalPrice &&
            currentProduct?.discountPercent === nextProduct?.discountPercent &&
            currentProduct?.reviewCount === nextProduct?.reviewCount &&
            currentProduct?.rating === nextProduct?.rating
          ) {
            return currentProduct
          }

          return nextProduct
        })

        if (nextProduct) {
          console.info("[Widkueski] Producto detectado", nextProduct)
        }
      }, refresh_product_timeout)
    }
    refreshProduct()

    // watch for DOM mutation and refresh the product data <- consider popstate over onpopstate?
    const observer = new MutationObserver(refreshProduct)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    })
    window.addEventListener("popstate", refreshProduct)

    return () => {
      window.clearTimeout(timeoutId)
      observer.disconnect()
      window.removeEventListener("popstate", refreshProduct)
    }
  }, [])

  if (!product) {
    return null
  }

  return (
    <FloatingFinanceWidget
      productPrice={product.price}
      productName={product.name}
      productDescription={product.description}
      originalPrice={product.originalPrice}
      discountPercent={product.discountPercent}
      rating={product.rating}
      reviewCount={product.reviewCount}
    />
  )
}

/// All the helper methods are based on amazon DOM structure if other website were to
/// use similar structure it might work but the output is undefined behavior
function detectSingleProduct(): ProductInfo | null {
  const amazonProduct = getAmazonProduct()
  if (amazonProduct) {
    return amazonProduct
  }

  const structuredProduct = getStructuredProduct()

  if (structuredProduct) {
    return structuredProduct
  }

  const name = getProductName()
  const price = getProductPrice()
  const originalPrice = getOriginalPrice()

  if (!name || !price || !looksLikeProductPage()) {
    return null
  }

  return {
    description: getProductDescription(),
    discountPercent: getDiscountPercent(price, originalPrice),
    name,
    originalPrice,
    price,
    rating: getProductRating(),
    reviewCount: getProductReviewCount()
  }
}

function getAmazonProduct(): ProductInfo | null {
  if (!location.hostname.includes("amazon.")) {
    return null
  }
  const name = normalizeText(
    document.querySelector<HTMLElement>("#productTitle")?.textContent
  )
  const price = getAmazonPrice()
  const originalPrice = getAmazonOriginalPrice(price)
  const discountPercent = getAmazonDiscountPercent(price, originalPrice)

  if (!name || !price || !looksLikeAmazonProductPage()) {
    return null
  }

  return {
    description: getAmazonDescription(), discountPercent,
    name, originalPrice, price, rating: getAmazonRating(),
    reviewCount: getAmazonReviewCount()
  }
}

function getStructuredProduct(): ProductInfo | null {
  const products: ProductInfo[] = []
  document
    .querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
    .forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || "")
        collectStructuredProducts(data, products)
      } catch {
        // ignoring no matches and posible uncatched 
        // error who cares right?, kind of not happing -> guard clauses
      }
    })

  const uniqueProducts = dedupeProducts(products)
  if (uniqueProducts.length === 1) { return uniqueProducts[0] }
  return null
}

function collectStructuredProducts(value: unknown, products: ProductInfo[]) {
  if (!value) { return }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStructuredProducts(item, products))
    return
  }
  if (typeof value !== "object") { return }

  const record = value as Record<string, unknown>
  const graph = record["@graph"]

  if (Array.isArray(graph)) {
    graph.forEach((item) => collectStructuredProducts(item, products))
  }

  if (!isProductType(record["@type"])) { return }

  const name = normalizeText(getString(record.name))
  const offerInfo = getOfferInfo(record.offers)
  const price = offerInfo.price ?? parsePrice(getString(record.price))
  const originalPrice = offerInfo.originalPrice
  const rating = getRatingValue(record.aggregateRating)
  const reviewCount = getReviewCount(record.aggregateRating)

  if (name && price) {
    products.push({
      description: normalizeText(getString(record.description)) || undefined,
      discountPercent: getDiscountPercent(price, originalPrice),
      name,
      originalPrice,
      price,
      rating,
      reviewCount
    })
  }
}

function getProductName(): string | null {
  const selectors = [
    "#productTitle",
    '[data-testid="product-title"]',
    '[data-test="product-title"]',
    '[itemprop="name"]',
    "main h1",
    "h1"
  ]

  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector)
    const text = normalizeText(element?.textContent)

    if (text && isVisible(element) && text.length >= 4) {
      return text
    }
  }

  const metaTitle =
    getMetaContent('meta[property="og:title"]') ||
    getMetaContent('meta[name="twitter:title"]')

  return cleanTitle(metaTitle)
}

function getProductDescription(): string | undefined {
  const selectors = [
    '[data-testid="product-description"]',
    '[data-test="product-description"]',
    '[itemprop="description"]',
    ".product-description",
    ".description"
  ]

  for (const selector of selectors) {
    const text = normalizeText(
      document.querySelector<HTMLElement>(selector)?.textContent
    )

    if (text && text.length >= 12 && text.length <= 180) {
      return text
    }
  }

  return undefined
}

function getProductRating(): number | null {
  const metaRating =
    getMetaContent('meta[itemprop="ratingValue"]') ||
    getMetaContent('meta[property="product:rating:value"]')
  const parsedMetaRating = parseRating(metaRating)

  if (parsedMetaRating) {
    return parsedMetaRating
  }

  const selectors = [
    '[itemprop="ratingValue"]',
    '[data-testid="rating"]',
    '[data-test="rating"]',
    ".rating",
    ".reviews-rating"
  ]

  for (const selector of selectors) {
    const rating = parseRating(getElementTextWithAttributes(selector))

    if (rating) {
      return rating
    }
  }

  return null
}

function getProductReviewCount(): number | null {
  const metaCount =
    getMetaContent('meta[itemprop="reviewCount"]') ||
    getMetaContent('meta[itemprop="ratingCount"]') ||
    getMetaContent('meta[property="product:rating:count"]')
  const parsedMetaCount = parseCount(metaCount)

  if (parsedMetaCount) {
    return parsedMetaCount
  }

  const selectors = [
    '[itemprop="reviewCount"]',
    '[itemprop="ratingCount"]',
    '[data-testid="review-count"]',
    '[data-test="review-count"]',
    ".review-count",
    ".reviews-count",
    ".rating-count"
  ]

  for (const selector of selectors) {
    const count = parseCount(getElementTextWithAttributes(selector))

    if (count) {
      return count
    }
  }

  return null
}

function getProductPrice(): number | null {
  const metaPrice =
    getMetaContent('meta[property="product:price:amount"]') ||
    getMetaContent('meta[property="og:price:amount"]') ||
    getMetaContent('meta[itemprop="price"]')
  const parsedMetaPrice = parsePrice(metaPrice)

  if (parsedMetaPrice) {
    return parsedMetaPrice
  }

  const selectors = [
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    "#corePriceDisplay_desktop_feature_div .a-offscreen",
    "#corePrice_feature_div .a-offscreen",
    "#apex_desktop .a-price .a-offscreen",
    "#newAccordionRow .a-price .a-offscreen",
    "#tp_price_block_total_price_ww .a-offscreen",
    "#desktop_buybox .a-price .a-offscreen",
    "#buybox .a-price .a-offscreen",
    ".a-price .a-offscreen",
    '[data-testid="product-price"]',
    '[data-test="product-price"]',
    '[itemprop="price"]',
    "[data-price]",
    ".price",
    ".product-price",
    ".sale-price"
  ]

  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector)
    const explicitPrice =
      element?.getAttribute("content") || element?.getAttribute("data-price")
    const price = parsePrice(explicitPrice || element?.textContent)

    if (price && (isVisible(element) || selector.includes("a-offscreen"))) {
      return price
    }
  }

  return null
}

function getOriginalPrice(): number | null {
  const metaPrice =
    getMetaContent('meta[property="product:original_price:amount"]') ||
    getMetaContent('meta[property="og:price:standard_amount"]')
  const parsedMetaPrice = parsePrice(metaPrice)

  if (parsedMetaPrice) {
    return parsedMetaPrice
  }

  const selectors = [
    '[data-testid="product-original-price"]',
    '[data-test="product-original-price"]',
    ".original-price",
    ".list-price",
    ".old-price",
    ".was-price",
    "s",
    "del"
  ]

  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector)
    const price = parsePrice(element?.textContent)

    if (price && isVisible(element)) {
      return price
    }
  }

  return null
}

function getAmazonPrice(): number | null {
  const selectors = [
    "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
    "#corePrice_feature_div .a-price .a-offscreen",
    "#apex_desktop .a-price .a-offscreen",
    "#newAccordionRow .a-price .a-offscreen",
    "#tp_price_block_total_price_ww .a-offscreen",
    "#desktop_buybox .a-price .a-offscreen",
    "#buybox .a-price .a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_dealprice"
  ]

  for (const selector of selectors) {
    const price = parsePrice(
      document.querySelector<HTMLElement>(selector)?.textContent
    )

    if (price) {
      return price
    }
  }

  const whole = normalizeText(
    document.querySelector<HTMLElement>(
      "#corePriceDisplay_desktop_feature_div .a-price-whole, #apex_desktop .a-price-whole, #buybox .a-price-whole"
    )?.textContent
  )
  const fraction = normalizeText(
    document.querySelector<HTMLElement>(
      "#corePriceDisplay_desktop_feature_div .a-price-fraction, #apex_desktop .a-price-fraction, #buybox .a-price-fraction"
    )?.textContent
  )

  if (whole) {
    return parsePrice(`${whole}${fraction ? `.${fraction}` : ""}`)
  }

  return null
}

function getAmazonOriginalPrice(currentPrice?: number | null): number | null {
  const selectors = [
    ".basisPrice .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .a-text-price .a-offscreen",
    "#apex_desktop .a-text-price .a-offscreen",
    "#buybox .a-text-price .a-offscreen",
    ".priceBlockStrikePriceString",
    "#listPrice",
    "#price .a-text-price .a-offscreen"
  ]

  for (const selector of selectors) {
    const price = parsePrice(
      document.querySelector<HTMLElement>(selector)?.textContent
    )

    if (price && (!currentPrice || price > currentPrice)) {
      return price
    }
  }

  return null
}

function getAmazonDiscountPercent(
  currentPrice?: number | null,
  originalPrice?: number | null
): number | null {
  const discountText = normalizeText(
    document.querySelector<HTMLElement>(
      ".savingsPercentage, #corePriceDisplay_desktop_feature_div .savingsPercentage"
    )?.textContent
  )
  const explicitDiscount = parsePercent(discountText)

  if (explicitDiscount) {
    return explicitDiscount
  }

  return getDiscountPercent(currentPrice, originalPrice)
}

function getAmazonRating(): number | null {
  const ratingText = getElementTextWithAttributes(
    "#acrPopover, #averageCustomerReviews .a-icon-alt, [data-hook='rating-out-of-text']"
  )

  return parseRating(ratingText)
}

function getAmazonReviewCount(): number | null {
  const reviewText = getElementTextWithAttributes(
    "#acrCustomerReviewText, #acrCustomerReviewLink, [data-hook='total-review-count']"
  )

  return parseCount(reviewText)
}

function getAmazonDescription(): string | undefined {
  const bullets = Array.from(
    document.querySelectorAll<HTMLElement>(
      "#feature-bullets li span.a-list-item"
    )
  )
    .map((item) => normalizeText(item.textContent))
    .filter(Boolean)

  if (bullets.length > 0) {
    return bullets.slice(0, 2).join(" · ").slice(0, 180)
  }
  return undefined
}

function looksLikeProductPage() {
  const productSignals = [
    '[itemtype*="schema.org/Product"]',
    '[data-testid="product-detail"]',
    '[data-test="product-detail"]',
    "#dp",
    "#ppd",
    "#buybox",
    "#add-to-cart-button",
    'button[name="add"]',
    'button[aria-label*="carrito" i]',
    'button[aria-label*="cart" i]',
    '[data-testid*="add-to-cart" i]'
  ]

  return productSignals.some((selector) => document.querySelector(selector))
}

function looksLikeAmazonProductPage() {
  return Boolean(
    document.querySelector("#dp") ||
    document.querySelector("#ppd") ||
    document.querySelector("#centerCol") ||
    document.querySelector("#add-to-cart-button") ||
    location.pathname.includes("/dp/") ||
    location.pathname.includes("/gp/product/")
  )
}

function getOfferInfo(offers: unknown): {
  originalPrice: number | null
  price: number | null
} {
  if (!offers) {
    return { originalPrice: null, price: null }
  }

  if (Array.isArray(offers)) {
    for (const offer of offers) {
      const offerInfo = getOfferInfo(offer)

      if (offerInfo.price) {
        return offerInfo
      }
    }

    return { originalPrice: null, price: null }
  }

  if (typeof offers !== "object") {
    return { originalPrice: null, price: parsePrice(getString(offers)) }
  }

  const record = offers as Record<string, unknown>
  const price = parsePrice(
    getString(record.price) || getString(record.lowPrice)
  )
  const originalPrice = parsePrice(
    getString(record.highPrice) ||
    getString(record.priceSpecification) ||
    getString(record.listPrice)
  )

  return {
    originalPrice,
    price
  }
}

function parsePrice(value?: string | null): number | null {
  if (!value) {
    return null
  }

  const match = value.match(
    /(?:MXN|MEX\$|\$)?\s*([0-9]{1,3}(?:[,.][0-9]{3})*(?:[,.][0-9]{2})?|[0-9]+(?:[,.][0-9]{2})?)/i
  )

  if (!match) {
    return null
  }

  const numericText = match[1]
  const normalized =
    numericText.includes(".") && numericText.includes(",")
      ? numericText.replace(/,/g, "")
      : numericText.replace(/,/g, "")
  const price = Number(normalized)

  if (!Number.isFinite(price) || price <= 0) {
    return null
  }
  return Math.round(price)
}

function getDiscountPercent(
  currentPrice?: number | null,
  originalPrice?: number | null
): number | null {
  if (!currentPrice || !originalPrice || originalPrice <= currentPrice) {
    return null
  }

  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
}

function getRatingValue(value: unknown): number | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  return parseRating(getString(record.ratingValue))
}

function getReviewCount(value: unknown): number | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  return parseCount(
    getString(record.reviewCount) || getString(record.ratingCount)
  )
}

function parseCount(value?: string | null): number | null {
  if (!value) {
    return null
  }

  const match = value.replace(/\s/g, "").match(/([0-9][0-9,.]*)/)

  if (!match) {
    return null
  }

  const count = Number(match[1].replace(/[,.]/g, ""))

  return Number.isFinite(count) && count > 0 ? count : null
}

function parsePercent(value?: string | null): number | null {
  if (!value) {
    return null
  }

  const match = value.match(/-?\s*([0-9]{1,3})\s*%/)

  if (!match) {
    return null
  }

  const percent = Number(match[1])

  return Number.isFinite(percent) && percent > 0 ? percent : null
}

function parseRating(value?: string | null): number | null {
  if (!value) {
    return null
  }

  const match = value.replace(",", ".").match(/([0-5](?:\.[0-9])?)/)

  if (!match) {
    return null
  }

  const rating = Number(match[1])

  return Number.isFinite(rating) && rating > 0 && rating <= 5 ? rating : null
}

function dedupeProducts(products: ProductInfo[]) {
  const byKey = new Map<string, ProductInfo>()

  products.forEach((product) => {
    byKey.set(
      `${product.name.toLowerCase()}-${Math.round(product.price)}`,
      product
    )
  })

  return Array.from(byKey.values())
}

function isProductType(type: unknown) {
  if (Array.isArray(type)) {
    return type.some(isProductType)
  }

  return typeof type === "string" && type.toLowerCase().includes("product")
}

function getString(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }

  return null
}

function getMetaContent(selector: string) {
  return document.querySelector<HTMLMetaElement>(selector)?.content || null
}

function getElementTextWithAttributes(selector: string) {
  const element = document.querySelector<HTMLElement>(selector)

  return normalizeText(
    [
      element?.textContent,
      element?.getAttribute("content"),
      element?.getAttribute("title"),
      element?.getAttribute("aria-label"),
      element?.getAttribute("data-rating"),
      element?.getAttribute("data-value")
    ]
      .filter(Boolean)
      .join(" ")
  )
}

function normalizeText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || null
}

function cleanTitle(value?: string | null) {
  const text = normalizeText(value)

  if (!text) {
    return null
  }

  return text.split(/\s+[|–-]\s+/)[0] || text
}

function isVisible(element?: HTMLElement | null) {
  if (!element) {
    return false
  }

  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  )
}
