import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Force rebuild after git pull
createRoot(document.getElementById("root")!).render(<App />);
