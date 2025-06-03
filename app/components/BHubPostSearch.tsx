"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';

interface BHubPostSearchProps {
  communityName: string;
}

export default function BHubPostSearch({ communityName }: BHubPostSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(
        `/search?q=${encodeURIComponent(
          searchTerm.trim()
        )}&community=${encodeURIComponent(communityName)}`
      );
      setSearchTerm(''); // Clear search term after submission
    }
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleFormSubmit} className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={`Search posts in bhub/${communityName}...`}
          className="w-full pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </form>
    </div>
  );
}
