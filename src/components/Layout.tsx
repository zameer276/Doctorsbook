import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  UserPlus, 
  LogOut, 
  Menu, 
  X, 
  Stethoscope,
  User as UserIcon,
  Clock,
  Bell
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Notifications from './Notifications';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function SidebarItem({ to, icon: Icon, label, active, onClick }: SidebarItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
          : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? "text-white" : "text-slate-400 group-hover:text-indigo-600")} />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const menuItems = {
    admin: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/doctors', icon: UserPlus, label: 'Manage Doctors' },
      { to: '/admin/appointments', icon: Calendar, label: 'All Appointments' },
    ],
    doctor: [
      { to: '/doctor', icon: LayoutDashboard, label: 'My Dashboard' },
      { to: '/doctor/appointments', icon: Calendar, label: 'My Appointments' },
    ],
    patient: [
      { to: '/patient', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/patient/doctors', icon: Stethoscope, label: 'Find Doctors' },
      { to: '/patient/appointments', icon: Clock, label: 'My Appointments' },
    ],
  };

  const currentRoleItems = profile ? menuItems[profile.role] : [];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Stethoscope className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">DocBooker</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {currentRoleItems.map((item) => (
            <SidebarItem
              key={item.to}
              {...item}
              active={location.pathname === item.to}
            />
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{profile?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <Stethoscope className="text-indigo-600 w-6 h-6" />
          <span className="font-bold text-slate-900">DocBooker</span>
        </div>
        <div className="flex items-center gap-2">
          <Notifications />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "lg:hidden fixed top-16 bottom-0 left-0 w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out p-6",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <nav className="space-y-2">
          {currentRoleItems.map((item) => (
            <SidebarItem
              key={item.to}
              {...item}
              active={location.pathname === item.to}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100 absolute bottom-6 left-6 right-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:p-10 p-4 pt-20 lg:pt-10 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Top Bar */}
          <div className="hidden lg:flex items-center justify-end mb-8">
            <Notifications />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
