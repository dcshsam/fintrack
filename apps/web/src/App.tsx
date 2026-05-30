import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CategoriesPage from './pages/CategoriesPage';
import HoldingsPage from './pages/HoldingsPage';
import PortfolioPage from './pages/PortfolioPage';
import MonthlyPage from './pages/MonthlyPage';
import Sidebar from './components/Sidebar';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

export default function App() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={accessToken ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={accessToken ? <Navigate to="/" replace /> : <RegisterPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedLayout>
              <DashboardPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedLayout>
              <TransactionsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedLayout>
              <CategoriesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/holdings"
          element={
            <ProtectedLayout>
              <HoldingsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/portfolio"
          element={
            <ProtectedLayout>
              <PortfolioPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/monthly"
          element={
            <ProtectedLayout>
              <MonthlyPage />
            </ProtectedLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
