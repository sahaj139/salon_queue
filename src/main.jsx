import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { PinGate } from './ui.jsx';
import Home from './pages/Home.jsx';
import Join from './pages/Join.jsx';
import Status from './pages/Status.jsx';
import Reception from './pages/Reception.jsx';
import Barber from './pages/Barber.jsx';
import Display from './pages/Display.jsx';
import Admin from './pages/Admin.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<Join />} />
        <Route path="/status/:id" element={<Status />} />
        <Route path="/reception" element={<PinGate><Reception /></PinGate>} />
        <Route path="/barber/:id" element={<PinGate><Barber /></PinGate>} />
        <Route path="/display" element={<Display />} />
        <Route path="/admin" element={<PinGate><Admin /></PinGate>} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
