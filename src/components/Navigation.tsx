import { Button } from "./ui/button";
import { ShoppingBag, Users, ChefHat } from "lucide-react";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  return (
    <nav className="bg-card border-b border-border p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-primary">RestaurantOS</h1>
        </div>
        
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-4">
          <Button
            variant={currentView === "order" ? "default" : "outline"}
            onClick={() => onViewChange("order")}
            className="flex items-center gap-2 text-sm sm:text-base"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Ordenar</span>
            <span className="sm:hidden">Pedir</span>
          </Button>
          
          <Button
            variant={currentView === "cashier" ? "default" : "outline"}
            onClick={() => onViewChange("cashier")}
            className="flex items-center gap-2 text-sm sm:text-base"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Caja</span>
            <span className="sm:hidden">Caja</span>
          </Button>
          
          <Button
            variant={currentView === "kitchen" ? "default" : "outline"}
            onClick={() => onViewChange("kitchen")}
            className="flex items-center gap-2 text-sm sm:text-base"
          >
            <ChefHat className="h-4 w-4" />
            <span className="hidden sm:inline">Cocina</span>
            <span className="sm:hidden">Cocina</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}