"use client";

import { useTranslations } from "next-intl";
import { useFavorites } from "@/hooks/useFavorites";

type Props = {
  toolKey: string;
  className?: string;
};

export default function StarButton({ toolKey, className }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const t = useTranslations("favorites");
  const active = isFavorite(toolKey);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(toolKey);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? t("removeFromFavorites") : t("addToFavorites")}
      aria-pressed={active}
      title={active ? t("removeFromFavorites") : t("addToFavorites")}
      className={
        "inline-flex items-center justify-center transition-colors " +
        (active ? "text-teal" : "text-text-secondary hover:text-teal") +
        (className ? " " + className : " w-5 h-5")
      }
    >
      {active ? (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-full h-full"
          aria-hidden="true"
        >
          <path d="M12 2.5l2.92 6.06 6.58.86-4.82 4.6 1.2 6.52L12 18.95 6.12 21.54l1.2-6.52-4.82-4.6 6.58-.86L12 2.5z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
          aria-hidden="true"
        >
          <path d="M12 2.5l2.92 6.06 6.58.86-4.82 4.6 1.2 6.52L12 18.95 6.12 21.54l1.2-6.52-4.82-4.6 6.58-.86L12 2.5z" />
        </svg>
      )}
    </button>
  );
}
