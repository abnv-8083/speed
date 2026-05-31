import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext';
import { ModalProvider } from './components/ModalContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Financial from './pages/Financial';
import LoanDetails from './pages/LoanDetails';
import BillingLayout from './pages/billing/BillingLayout';
import POS from './pages/billing/POS';
import Products from './pages/billing/Products';
import Invoices from './pages/billing/Invoices';
import SalesReport from './pages/billing/SalesReport';
import CVGenerator from './pages/cv/CVGenerator';
import SavedCVs from './pages/cv/SavedCVs';
import ToolsPortal from './pages/tools/ToolsPortal';
import PasswordManager from './pages/passwords/PasswordManager';
import ThemeToggle from './components/ThemeToggle';
import Layout from './components/Layout';

function App() {
  return (
    <ModalProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={
              <>
                <ThemeToggle />
                <Login />
              </>
            } />
            
            {/* Protected Routes wrapped in Layout */}
            <Route element={<Layout />}>
              <Route path="/home" element={<Home />} />
              
              {/* Billing Module Nested Routes */}
              <Route path="/billing" element={<BillingLayout />}>
                <Route index element={<Navigate to="pos" replace />} />
                <Route path="pos" element={<POS />} />
                <Route path="products" element={<Products />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="reports" element={<SalesReport />} />
              </Route>
              
              <Route path="/financial" element={<Financial />} />
              <Route path="/financial/loan/:id" element={<LoanDetails />} />
              <Route path="/cv" element={<CVGenerator />} />
              <Route path="/cv/saved" element={<SavedCVs />} />
              <Route path="/tools" element={<ToolsPortal />} />
              <Route path="/passwords" element={<PasswordManager />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </ModalProvider>
  );
}

export default App;
