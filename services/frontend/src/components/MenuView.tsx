import  { useState } from "react";
import type { MenuItem as POSMenuItem } from "../types/pos"; // ← use your shared POS types
import { MenuItemCard } from "./MenuItemCard";
import { Button } from "./ui/button";

interface MenuViewProps {
    onAddToOrder: (
        menuItem: POSMenuItem,
        quantity?: number,
        notes?: string
    ) => void;
}

// Mock menu data
const MENU_ITEMS: POSMenuItem[] = [
    // Appetizers
    {
        id: "app-1",
        name: "Buffalo Wings",
        price: 12.99,
        category: "appetizers",
        description:
            "Crispy chicken wings with buffalo sauce and ranch dip",
    },
    {
        id: "app-2",
        name: "Mozzarella Sticks",
        price: 8.99,
        category: "appetizers",
        description: "Golden fried mozzarella with marinara sauce",
    },
    {
        id: "app-3",
        name: "Loaded Nachos",
        price: 10.99,
        category: "appetizers",
        description:
            "Tortilla chips with cheese, jalapeños, sour cream, and guacamole",
    },

    // Main Courses
    {
        id: "main-1",
        name: "Classic Burger",
        price: 15.99,
        category: "mains",
        description:
            "Beef patty with lettuce, tomato, onion, and fries",
    },
    {
        id: "main-2",
        name: "Grilled Salmon",
        price: 22.99,
        category: "mains",
        description:
            "Fresh Atlantic salmon with vegetables and rice",
    },
    {
        id: "main-3",
        name: "Chicken Alfredo",
        price: 18.99,
        category: "mains",
        description:
            "Grilled chicken breast over fettuccine pasta with alfredo sauce",
    },
    {
        id: "main-4",
        name: "BBQ Ribs",
        price: 24.99,
        category: "mains",
        description:
            "Full rack of ribs with BBQ sauce and coleslaw",
    },
    {
        id: "main-5",
        name: "Caesar Salad",
        price: 12.99,
        category: "mains",
        description:
            "Romaine lettuce with parmesan, croutons, and caesar dressing",
    },

    // Beverages
    {
        id: "bev-1",
        name: "Coca-Cola",
        price: 2.99,
        category: "beverages",
        description: "Classic soft drink",
    },
    {
        id: "bev-2",
        name: "Fresh Lemonade",
        price: 3.99,
        category: "beverages",
        description: "Freshly squeezed lemon juice with mint",
    },
    {
        id: "bev-3",
        name: "Coffee",
        price: 2.49,
        category: "beverages",
        description: "Freshly brewed coffee",
    },
    {
        id: "bev-4",
        name: "Iced Tea",
        price: 2.79,
        category: "beverages",
        description: "Sweet or unsweetened",
    },

    // Desserts
    {
        id: "des-1",
        name: "Chocolate Cake",
        price: 6.99,
        category: "desserts",
        description: "Rich chocolate cake with vanilla ice cream",
    },
    {
        id: "des-2",
        name: "Apple Pie",
        price: 5.99,
        category: "desserts",
        description: "Homemade apple pie with cinnamon",
    },
    {
        id: "des-3",
        name: "Ice Cream Sundae",
        price: 4.99,
        category: "desserts",
        description:
            "Vanilla ice cream with chocolate sauce and whipped cream",
    },
];

const CATEGORIES = [
    { id: "appetizers", name: "Appetizers", icon: "🥗" },
    { id: "mains", name: "Main Courses", icon: "🍽️" },
    { id: "beverages", name: "Beverages", icon: "🥤" },
    { id: "desserts", name: "Desserts", icon: "🍰" },
];

export function MenuView({ onAddToOrder }: MenuViewProps) {
    const [selectedCategory, setSelectedCategory] = useState("appetizers");

    const getItemsByCategory = (category: string) =>
        MENU_ITEMS.filter((item) => item.category === category);

    const handleAddToOrder = (
        menuItem: POSMenuItem,
        quantity: number = 1,
        notes?: string
    ) => {
        onAddToOrder(menuItem, quantity, notes);
    };

    return (
        <div className="w-full max-w-none">
            <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl mb-3 text-foreground">
                    Restaurant Menu
                </h2>
                <p className="text-muted-foreground text-base sm:text-lg">
                    Select items to add to your order
                </p>
            </div>

            {/* Category Navigation */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-2 p-3 sm:p-4 bg-card rounded-xl border border-border">
                    {CATEGORIES.map((category) => (
                        <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? "default" : "outline"}
                            onClick={() => setSelectedCategory(category.id)}
                            className="flex items-center gap-2 px-3 py-2 sm:px-6 sm:py-3 text-sm sm:text-base min-h-[44px]"
                            size="sm"
                        >
              <span className="text-base sm:text-lg" role="img" aria-label={category.name}>
                {category.icon}
              </span>
                            <span className="font-medium whitespace-nowrap">
                {category.name}
              </span>
                        </Button>
                    ))}
                </div>
            </div>

            {/* Current Category Title */}
            <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-medium text-foreground">
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.name}
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base">
                    {getItemsByCategory(selectedCategory).length} items available
                </p>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                {getItemsByCategory(selectedCategory).map((item) => (
                    <MenuItemCard
                        key={item.id}
                        item={item}
                        onAddToOrder={handleAddToOrder}
                    />
                ))}
            </div>

            {/* Status (optional) */}
            <div className="mt-4 p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                <p>
                    ✓ Menu loaded: {MENU_ITEMS.length} total items,{" "}
                    {getItemsByCategory(selectedCategory).length} in "{selectedCategory}"
                </p>
                <p>✓ Add to order function: {typeof onAddToOrder === "function" ? "Ready" : "Error"}</p>
                <p>✓ Selected category: {selectedCategory}</p>
            </div>
        </div>
    );
}
