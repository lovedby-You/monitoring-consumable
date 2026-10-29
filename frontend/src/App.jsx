import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StockIn from './pages/StockIn';
import StockOut from './pages/StockOut';
import Consumables from './pages/Consumables';
import DailyOrders from './pages/DailyOrders';
import Monitoring from './pages/Monitoring';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="penerimaan" element={<StockIn />} />
        <Route path="pengambilan" element={<StockOut />} />
        <Route
          path="monitoring"
          element={
            <ProtectedRoute adminOnly>
              <Monitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="consumables"
          element={
            <ProtectedRoute adminOnly>
              <Consumables />
            </ProtectedRoute>
          }
        />
        <Route
          path="order-hari-ini"
          element={
            <ProtectedRoute adminOnly>
              <DailyOrders />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
