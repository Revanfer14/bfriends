"use client";

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption = 'recent' | 'top-today' | 'top-week' | 'top-month' | 'top-year';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'top-today', label: 'Top Today' },
  { value: 'top-week', label: 'Top This Week' },
  { value: 'top-month', label: 'Top This Month' },
  { value: 'top-year', label: 'Top This Year' },
];

interface SortPostsDropdownProps {
  currentSort: SortOption;
}

export function SortPostsDropdown({ currentSort }: SortPostsDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (value: string) => {
    const newSort = value as SortOption;
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    if (newSort === 'recent') {
      current.delete('sort');
    } else {
      current.set('sort', newSort);
    }

    // Always reset to page 1 when sort order changes
    current.set('page', '1');

    const search = current.toString();
    const query = search ? `?${search}` : '';

    router.push(`${pathname}${query}`);
  };

  return (
    <Select value={currentSort} onValueChange={handleSortChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
