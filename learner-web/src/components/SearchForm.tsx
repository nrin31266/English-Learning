import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar";

interface SearchFormProps
  extends Omit<React.ComponentProps<"form">, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function SearchForm({
  value,
  onChange,
  placeholder = "Search...",
  ...props
}: SearchFormProps) {
  return (
    <form {...props}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>

          <SidebarInput
            id="search"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange?.(e.target.value)}
            className="pl-8"
          />

          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  );
}
