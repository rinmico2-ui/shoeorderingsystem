import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { StoreLayout } from '@/layouts/StoreLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { HomePage } from '@/pages/store/HomePage'
import { ShopPage } from '@/pages/store/ShopPage'
import { ProductPage } from '@/pages/store/ProductPage'
import { CartPage } from '@/pages/store/CartPage'
import { AdminCustomersPage, AdminPromotionsPage, AdminReviewsPage, AdminReportsPage, AdminSettingsPage } from '@/pages/admin/AdminMiscPages'

const CheckoutPage = lazy(() => import('@/pages/store/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const AccountPage = lazy(() => import('@/pages/store/AccountPage').then((m) => ({ default: m.AccountPage })))
const WishlistPage = lazy(() => import('@/pages/store/WishlistPage').then((m) => ({ default: m.WishlistPage })))
const OrderTrackingPage = lazy(() => import('@/pages/store/OrderTrackingPage').then((m) => ({ default: m.OrderTrackingPage })))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const AdminLoginPage = lazy(() => import('@/pages/auth/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const AdminInventoryPage = lazy(() => import('@/pages/admin/AdminInventoryPage').then((m) => ({ default: m.AdminInventoryPage })))
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })))
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })))


function Loading() {
  return <div className="container-page space-y-4 py-10"><div className="skeleton h-8 w-1/3" /><div className="skeleton h-64 w-full" /></div>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/account/*" element={<AccountPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/track/:orderNumber" element={<OrderTrackingPage />} />
          <Route path="/track" element={<OrderTrackingPage />} />
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="inventory" element={<AdminInventoryPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="promotions" element={<AdminPromotionsPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
