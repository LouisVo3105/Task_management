import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from "@material-tailwind/react";
import { NotificationProvider } from './components/NotificationProvider/index.jsx';
import { SSEProvider } from "./utils/SSEContext";

ReactDOM.createRoot(document.getElementById('root')).render(
    <ThemeProvider>
        <NotificationProvider>
            <SSEProvider>
                <App />
            </SSEProvider>
        </NotificationProvider>
    </ThemeProvider>
)
