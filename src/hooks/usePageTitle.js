import { useEffect } from 'react';

export default function usePageTitle(title) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
