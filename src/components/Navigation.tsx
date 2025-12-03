import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from "./ui/button";
import { ShoppingBag, Users, ChefHat, LogOut, Menu, Package, FolderTree, Settings, BarChart3 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import "../styles/navigation.css";

export function Navigation() {
  const { user, logout, hasRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    // Handle both full names and usernames
    const parts = name.includes(' ') ? name.split(' ') : [name];
    return parts
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Prefer firstName (givenName) for display
  const displayName = user?.givenName || user?.username || user?.name || user?.id || 'Usuario';

  const handleLogout = async () => {
    await logout();
  };

  // Define navigation items based on roles
  const navItems = [
    {
      path: '/pedidos',
      label: 'Pedidos',
      icon: ShoppingBag,
      show: hasRole('admin') || hasRole('cashier'),
    },
    {
      path: '/caja',
      label: 'Caja',
      icon: Users,
      show: hasRole('admin') || hasRole('cashier'),
    },
    {
      path: '/cocina',
      label: 'Cocina',
      icon: ChefHat,
      show: hasRole('admin') || hasRole('kitchen') || hasRole('chef'),
    },
    {
      path: '/products',
      label: 'Products',
      icon: Package,
      show: hasRole('admin') || hasRole('cashier'),
    },
    {
      path: '/categories',
      label: 'Categories',
      icon: FolderTree,
      show: hasRole('admin'),
    },
    {
      path: '/contable',
      label: 'Contable',
      icon: BarChart3,
      show: hasRole('admin'),
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: Settings,
      show: hasRole('admin'),
    },
  ];

  return (
    <nav className="nav-bar">
      <div className="nav-container">
        <div className="nav-content">
          {/* Logo */}
          <div className="nav-logo">
            <h1 className="nav-logo-text">RestaurantOS</h1>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="nav-tabs">
            {navItems.map((item) => 
              item.show ? (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                  }
                >
                  <item.icon className="nav-link-icon" />
                  <span>{item.label}</span>
                </NavLink>
              ) : null
            )}
          </div>

          {/* Right side - User Menu & Hamburger */}
          <div className="nav-actions">
            {/* User Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="nav-avatar-btn">
                  <Avatar className="nav-avatar">
                    <AvatarFallback className="nav-avatar-fallback">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium leading-none">
                    {displayName}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Hamburger Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                
                <div className="mobile-menu-content">
                  {/* User Info */}
                  <div className="mobile-user-info">
                    <Avatar className="mobile-user-avatar">
                      <AvatarFallback className="mobile-user-avatar-fallback">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mobile-user-details">
                      <p className="mobile-user-name">
                        {displayName}
                      </p>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="mobile-nav-links">
                    {navItems.map((item) => 
                      item.show ? (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `mobile-nav-link ${isActive ? 'mobile-nav-link-active' : 'mobile-nav-link-inactive'}`
                          }
                        >
                          <item.icon className="mobile-nav-link-icon" />
                          <span>{item.label}</span>
                        </NavLink>
                      ) : null
                    )}
                  </div>

                  {/* Logout Button */}
                  <Button
                    variant="outline"
                    className="mobile-logout-btn"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="mobile-logout-icon" />
                    <span>Cerrar Sesión</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
