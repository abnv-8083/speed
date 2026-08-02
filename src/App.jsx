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
import ProductDetail from './pages/billing/ProductDetail';
import Invoices from './pages/billing/Invoices';
import SalesReport from './pages/billing/SalesReport';
import QuickBill from './pages/billing/QuickBill';
import QuickBillHistory from './pages/billing/QuickBillHistory';
import CVGenerator from './pages/cv/CVGenerator';
import SavedCVs from './pages/cv/SavedCVs';
import CVLayout from './pages/cv/CVLayout';
import ToolsPortal from './pages/tools/ToolsPortal';
import ToolsLayout from './pages/tools/ToolsLayout';
import PasswordManager from './pages/passwords/PasswordManager';
import PrintingHistory from './pages/printing/PrintingHistory';
import PrintingLayout from './pages/printing/PrintingLayout';
import Layout from './components/Layout';

function App() {
  return (
    <ModalProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes wrapped in Layout */}
            <Route element={<Layout />}>
              <Route path="/home" element={<Home />} />
              
              {/* Billing Module Nested Routes */}
              <Route path="/billing" element={<BillingLayout />}>
                <Route index element={<Navigate to="pos" replace />} />
                <Route path="pos"        element={<POS />} />
                <Route path="quickbill"  element={<QuickBill />} />
                <Route path="quickbill/history" element={<QuickBillHistory />} />
                <Route path="products"   element={<Products />} />
                <Route path="products/:id" element={<ProductDetail />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="reports" element={<SalesReport />} />
              </Route>
              
              <Route path="/financial" element={<Financial />} />
              <Route path="/financial/loan/:id" element={<LoanDetails />} />
              <Route path="/cv" element={<CVLayout />}>
                <Route index element={<CVGenerator />} />
                <Route path="saved" element={<SavedCVs />} />
              </Route>
              <Route path="/tools" element={<ToolsLayout />}>
                <Route index element={<ToolsPortal />} />
                <Route path="convert" element={<ToolsPortal />} />
                <Route path="size"    element={<ToolsPortal />} />
                <Route path="image"   element={<ToolsPortal />} />
              </Route>
              <Route path="/passwords" element={<PasswordManager />} />
              <Route path="/printing" element={<PrintingLayout />}>
                <Route index element={<Navigate to="stock" replace />} />
                <Route path="stock"   element={<PrintingHistory />} />
                <Route path="log"     element={<PrintingHistory />} />
                <Route path="history" element={<PrintingHistory />} />
                <Route path="setup"   element={<PrintingHistory />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </ModalProvider>
  );
}

export default App;
