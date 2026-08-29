import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
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
import WorkList from './pages/works/WorkList';
import WorkDetail from './pages/works/WorkDetail';
import CustomerList from './pages/customers/CustomerList';
import CustomerDetail from './pages/customers/CustomerDetail';
import PrintingHistory from './pages/printing/PrintingHistory';
import PrintingLayout from './pages/printing/PrintingLayout';
import Layout from './components/Layout';
import PublicWebsite from './website/PublicWebsite';
import WebsiteSettings from './pages/admin/WebsiteSettings';

function App() {
  return (
    <ThemeProvider>
      <ModalProvider>
        <ToastProvider>
          <Router>
            <Routes>
              {/* ═══════ PUBLIC WEBSITE (root) ══════════════════ */}
              <Route path="/" element={<PublicWebsite />} />

              {/* ═══════ ADMIN / POS SYSTEM (/admin/*) ══════════ */}
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin" element={<Layout />}>
                <Route index element={<Navigate to="/admin/home" replace />} />
                <Route path="home" element={<Home />} />
                
                {/* Billing Module */}
                <Route path="billing" element={<BillingLayout />}>
                  <Route index element={<Navigate to="quickbill" replace />} />
                  <Route path="pos"        element={<Navigate to="/admin/billing/quickbill" replace />} />
                  <Route path="quickbill"  element={<QuickBill />} />
                  <Route path="quickbill/history" element={<QuickBillHistory />} />
                  <Route path="products"   element={<Products />} />
                  <Route path="products/:id" element={<ProductDetail />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="reports" element={<SalesReport />} />
                  <Route path="works" element={<WorkList />} />
                  <Route path="works/:id" element={<WorkDetail />} />
                  <Route path="customers" element={<CustomerList />} />
                  <Route path="customers/:id" element={<CustomerDetail />} />
                </Route>
                
                <Route path="financial" element={<Financial />} />
                <Route path="financial/loan/:id" element={<LoanDetails />} />
                <Route path="cv" element={<CVLayout />}>
                  <Route index element={<CVGenerator />} />
                  <Route path="saved" element={<SavedCVs />} />
                </Route>
                <Route path="tools" element={<ToolsLayout />}>
                  <Route index element={<ToolsPortal />} />
                  <Route path="convert" element={<ToolsPortal />} />
                  <Route path="size"    element={<ToolsPortal />} />
                  <Route path="image"   element={<ToolsPortal />} />
                </Route>
                <Route path="printing" element={<PrintingLayout />}>
                  <Route index element={<Navigate to="stock" replace />} />
                  <Route path="stock"   element={<PrintingHistory />} />
                  <Route path="log"     element={<PrintingHistory />} />
                  <Route path="history" element={<PrintingHistory />} />
                  <Route path="setup"   element={<PrintingHistory />} />
                </Route>
                <Route path="website" element={<WebsiteSettings />} />
              </Route>

              {/* Legacy redirects */}
              <Route path="/login" element={<Navigate to="/admin/login" replace />} />
              <Route path="/home" element={<Navigate to="/admin/home" replace />} />
              <Route path="/billing/*" element={<Navigate to="/admin/billing" replace />} />
            </Routes>
          </Router>
        </ToastProvider>
      </ModalProvider>
    </ThemeProvider>
  );
}

export default App;
