"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

const UrlToastHandler = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const toastMessage = searchParams.get('toast_message');

    if (toastMessage) {
      if (toastMessage === 'post_deleted_successfully') {
        toast.success('Post deleted successfully!');
      }
      // Add more toast messages here if needed
      // else if (toastMessage === 'another_message_key') {
      //   toast.info('Another message!');
      // }

      // Remove the toast_message query parameter from the URL
      // to prevent it from showing again on refresh or back navigation.
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('toast_message');
      const newUrl = `${pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`;
      router.replace(newUrl, { scroll: false }); // Use replace to not add to history, scroll: false to maintain scroll position
    }
  }, [searchParams, router, pathname]);

  return null; // This component doesn't render anything visible
};

export default UrlToastHandler;
