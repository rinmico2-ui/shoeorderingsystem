import { Link, Outlet } from 'react-router-dom'
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-ivory/40">
      <header className="safe-top border-b border-brand-border bg-white px-4 py-3">
        <Link to="/" className="font-heading text-base font-extrabold">Khyleene's <span className="text-brand-taupe">Collection</span></Link>
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md"><Outlet /></div>
      </div>
    </div>
  )
}
