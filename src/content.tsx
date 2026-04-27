import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"

import { FloatingFinanceWidget } from "./app/components/FloatingFinanceWidget"
import cssText from "data-text:./styles/index.css"
import "./styles/index.css"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

function ContentWidget() {
  return (
    <FloatingFinanceWidget
      productPrice={4999}
      productName="Smartphone Premium Pro Max"
    />
  )
}

export default ContentWidget
