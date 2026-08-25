import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ShoppingCart, Package, Receipt, BarChart3, Zap, Users, Briefcase } from 'lucide-react';
import { useSubNav } from '../../components/SubNavContext';
import './BillingLayout.css';

const BILLING_TABS = [
  { to: '/admin/billing/quickbill',  icon: Zap,          label: 'Quick Bill'     },
  { to: '/admin/billing/products',   icon: Package,      label: 'Inventory'      },
  { to: '/admin/billing/invoices',   icon: Receipt,      label: 'Invoices'       },
  { to: '/admin/billing/customers',  icon: Users,        label: 'Customers'      },
  { to: '/admin/billing/works',      icon: Briefcase,    label: 'Works'          },
  { to: '/admin/billing/reports',    icon: BarChart3,    label: 'Sales Report'   },
];

const BillingLayout = () => {
  const { setTabs } = useSubNav();

  // Register tabs when billing section mounts, clear on unmount
  useEffect(() => {
    setTabs(BILLING_TABS);
    return () => setTabs([]);
  }, [setTabs]);

  return (
    <div className="billing-module-layout">
      <main className="billing-content">
        <Outlet />
      </main>
    </div>
  );
};

export default BillingLayout;
