import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// #region agent log
const _dbg = (location, message, data, hypothesisId) => fetch('http://127.0.0.1:7902/ingest/c385147e-d6b8-4063-8961-f6887a43465a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'17f64e'},body:JSON.stringify({sessionId:'17f64e',location,message,data,hypothesisId,timestamp:Date.now()})}).catch(()=>{});
_dbg('main.jsx:boot', 'App boot', { href: window.location.href, perfNavType: performance.getEntriesByType('navigation')[0]?.type }, 'A');
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeFullReload', () => _dbg('main.jsx:hmr', 'Vite full reload triggered', {}, 'A'));
  import.meta.hot.on('vite:error', (err) => _dbg('main.jsx:hmr', 'Vite HMR error', { err: String(err) }, 'A'));
}
// #endregion

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)