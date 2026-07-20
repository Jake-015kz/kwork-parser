export interface ParsedProject {
  platformId: string;
  platform: "kwork" | "weblancer" | "telegram" | "flru" | "freelancer";
  categoryId: number;
  name: string;
  description: string;
  budget: string | null;
  maxDays: number | null;
  userName: string | null;
  userRating: string | null;
  userHiredPercent: number | null;
  userWantsCount: number | null;
  userBadges: string[];
  url: string;
  viewsCount: number | null;
  dateCreate: string | null;
}
