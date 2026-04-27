import { useState } from "react"

function Bubble() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 999999
    }}>
      
      {open && (
        <div style={{
          width: "260px",
          background: "white",
          padding: "16px",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          marginBottom: "10px"
        }}>
          <h3>WidKueski</h3>
          <p>Simula tus pagos aquí</p>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          border: "none",
          background: "#007C80",
          color: "white",
          fontSize: "24px",
          cursor: "pointer"
        }}
      >
        💬
      </button>
    </div>
  )
}

export default Bubble