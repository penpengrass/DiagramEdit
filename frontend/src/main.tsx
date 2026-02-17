//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
//<Strictmode></Strictmode>をはさむ必要があるかもしれない
createRoot(document.getElementById('root')!).render(
    <App />
)
