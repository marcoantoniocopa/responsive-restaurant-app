import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from "./ui/button";
import { ShoppingBag, Users, ChefHat, LogOut, Menu, X } from "lucide-react";
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

export function Navigation() {
  const { user, logout, hasRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
  ];

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <h1 className="text-primary font-bold text-xl">RestaurantOS</h1>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => 
              item.show ? (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ) : null
            )}
          </div>

          {/* Right side - User Menu & Hamburger */}
          <div className="flex items-center gap-2">
            {/* Desktop Logout Button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Logout</span>
            </Button>
            
            {/* User Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden sm:flex relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-orange-500 text-white">
                      {getInitials(user?.name || user?.username)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name || user?.username}
                    </p>
                    {user?.email && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                    {user?.roles && user.roles.length > 0 && (
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        {user.roles.join(', ')}
                      </p>
                    )}
                  </div>
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
                
                <div className="flex flex-col gap-4 mt-6">
                  {/* User Info */}
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-orange-500 text-white text-lg">
                        {getInitials(user?.name || user?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">
                        {user?.name || user?.username}
                      </p>
                      {user?.roles && user.roles.length > 0 && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {user.roles.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="flex flex-col gap-2">
                    {navItems.map((item) => 
                      item.show ? (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                              isActive
                                ? 'bg-orange-500 text-white'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`
                          }
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </NavLink>
                      ) : null
                    )}
                  </div>

                  {/* Logout Button */}
                  <Button
                    variant="outline"
                    className="mt-4 w-full justify-start gap-3"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-5 w-5" />
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
