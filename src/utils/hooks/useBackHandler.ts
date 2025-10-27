import { useEffect } from "react";

export default function useBackHandler(
  currentPage: string,
  onBack: (prevPage: string) => void
): void {
  useEffect(() => {
    window.history.pushState({ page: currentPage }, "");

    const handlePopState = (event: PopStateEvent) => {
      const prevPage = (event.state?.page as string) || currentPage;
      onBack(prevPage);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentPage, onBack]);
}
