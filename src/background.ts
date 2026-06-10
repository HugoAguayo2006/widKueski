type ApiRequestMessage = {
  init?: RequestInit
  type: "widkueski-api-request"
  url: string
}

chrome.runtime.onMessage.addListener((message: ApiRequestMessage, _sender, sendResponse) => {
  if (message?.type !== "widkueski-api-request") {
    return false
  }

  fetch(message.url, message.init)
    .then(async (response) => {
      const contentType = response.headers.get("content-type") ?? ""
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text()

      sendResponse({
        data,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      })
    })
    .catch((error) => {
      sendResponse({
        data: error instanceof Error ? error.message : "Error de conexión",
        ok: false,
        status: 0,
        statusText: "NETWORK_ERROR"
      })
    })

  return true
})
