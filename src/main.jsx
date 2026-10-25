// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )









import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

function ServerError() {
  return (
    <div className="server-error-container">
      <h1>Server Error</h1>
      <p>We're sorry, something went wrong.</p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ServerError />
  </StrictMode>,
)
