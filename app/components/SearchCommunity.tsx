"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import useSWR from "swr";
import { LayoutGrid, User, SearchIcon, X } from 'lucide-react'; // Added X icon
import { Badge } from "@/components/ui/badge"; // Added SearchIcon

interface Suggestion {
  type: 'community' | 'user';
  name: string;
  link: string;
  imageUrl?: string;
  userName?: string; // For user type, to construct link if needed
}

// No longer needs SearchCommunityProps if currentCommunity is derived from pathname

const fetchSuggestions = async (url: string) => {
  if (!url.includes('q=')) return []; // Don't fetch if query is not present (e.g. initial load)
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch suggestions");
  }
  return res.json();
};

export default function SearchCommunity() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);
  const router = useRouter();

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const canFetch = debouncedSearchTerm.length >= 2;
  const { data: suggestions = [] } = useSWR<Suggestion[]>(
    canFetch ? `/api/communities?q=${encodeURIComponent(debouncedSearchTerm)}` : null,
    fetchSuggestions,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length >= 2) {
      setIsDropdownVisible(true);
    } else {
      setIsDropdownVisible(false);
    }
  };

  const handleSuggestionClick = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setIsDropdownVisible(false);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      handleSuggestionClick(); // Clear search term and hide dropdown
    }
  };

  const communitySuggestions = suggestions.filter(s => s.type === 'community');
  const userSuggestions = suggestions.filter(s => s.type === 'user');

  return (
    <div className="relative w-full md:w-80">
      <form onSubmit={handleFormSubmit} className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search BHubs, People & Posts..."
          className="w-full pl-10"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchTerm.length >= 2 && suggestions.length > 0) {
              setIsDropdownVisible(true);
            }
          }}
          onBlur={() => {
            // Delay hiding dropdown to allow click on suggestions
            setTimeout(() => setIsDropdownVisible(false), 150);
          }}
        />

      </form>

      {isDropdownVisible && canFetch && (searchTerm.length > 0) && (suggestions.length > 0 || debouncedSearchTerm !== searchTerm) && (
        <Card className="absolute top-full mt-2 w-full bg-background dark:bg-background shadow-lg rounded-lg border max-h-96 overflow-y-auto z-50">
          <CardContent className="p-2">
            {communitySuggestions.length > 0 && (
              <div className="mb-2">
                <h4 className="px-2 py-1 text-xs font-semibold text-muted-foreground">BHUBS</h4>
                {communitySuggestions.map((suggestion) => (
                  <Link
                    key={`community-${suggestion.name}`}
                    href={suggestion.link}
                    className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-muted dark:hover:bg-muted-background rounded-md"
                    onClick={handleSuggestionClick}
                  >
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    <span>{suggestion.name}</span>
                  </Link>
                ))}
              </div>
            )}
            {userSuggestions.length > 0 && (
              <div>
                <h4 className="px-2 py-1 text-xs font-semibold text-muted-foreground">PEOPLE</h4>
                {userSuggestions.map((suggestion) => (
                  <Link
                    key={`user-${suggestion.userName || suggestion.name}`}
                    href={suggestion.link}
                    className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-muted dark:hover:bg-muted-background rounded-md"
                    onClick={handleSuggestionClick}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={suggestion.imageUrl || '/default.png'} alt={suggestion.name} />
                      <AvatarFallback>{suggestion.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{suggestion.name}</span>
                  </Link>
                ))}
              </div>
            )}
            {suggestions.length === 0 && debouncedSearchTerm === searchTerm && searchTerm.length >=2 && (
                 <p className="px-2 py-2 text-sm text-muted-foreground">No suggestions found.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// The refreshCommunities function might no longer be needed or might need to be rethought
// as SWR will revalidate based on the key (which includes debouncedSearchTerm)
// export function refreshCommunities() {
//   mutate("communities"); // This key is no longer used directly by SWR for suggestions
// }
