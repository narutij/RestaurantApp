import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 px-0">
      <Sun 
        onClick={() => setTheme("dark")} 
        className={`h-5 w-5 rotate-0 scale-100 transition-all ${theme === "dark" ? "hidden" : "block"}`}
      />
      <Moon 
        onClick={() => setTheme("light")} 
        className={`h-5 w-5 rotate-0 scale-100 transition-all ${theme === "dark" ? "block" : "hidden"}`}
      />
    </Button>
  )
}

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="flex items-center space-x-2">
      <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 bg-primary cursor-pointer"
           data-state={theme === "dark" ? "checked" : "unchecked"}
           onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <div className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-1"
             data-state={theme === "dark" ? "checked" : "unchecked"}
        />
      </div>
    </div>
  );
}