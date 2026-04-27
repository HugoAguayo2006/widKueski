import { FloatingFinanceWidget } from "./components/FloatingFinanceWidget"

// Vista demo del popup.
export default function App() {
  return (
    <FloatingFinanceWidget
      productPrice={4999}
      productName="Smartphone Premium Pro Max"
    />
  )
}
