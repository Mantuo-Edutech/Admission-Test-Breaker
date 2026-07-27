export const HOME_PAGE_TITLE = "UK Admission Test Prep | Mantuo 满托";

const EXAM_IDS = ["tmua", "esat", "tara", "lnat", "ucat"] as const;

const EXAM_PAGE_LABELS: Readonly<Record<string, string>> = {
  profile: "Course Profile",
  coverage: "Course Coverage",
  dashboard: "Course Coverage",
  preparation: "Course Coverage",
  "past-papers": "Online Practice",
  record: "Learning Record",
  resources: "Review Notes",
  notes: "Review Notes",
  coaching: "Expert Guidance",
};

const STATIC_PAGE_TITLES: Readonly<Record<string, string>> = {
  "/library": "Learning Library | Mantuo 满托",
  "/access": "Unlock Content | Mantuo 满托",
  "/register": "Create Account | Mantuo 满托",
  "/login": "Sign In | Mantuo 满托",
  "/account": "Account | Mantuo 满托",
  "/account/sharing": "Data Sharing | Mantuo 满托",
  "/collaboration": "Collaboration | Mantuo 满托",
  "/collaboration/redeem": "Accept Access | Mantuo 满托",
  "/privacy": "Privacy & Data Rights | Mantuo 满托",
  "/feedback": "Send Feedback | Mantuo 满托",
  "/forgot-password": "Reset Password | Mantuo 满托",
  "/auth/reset": "Set New Password | Mantuo 满托",
  "/auth/confirm": "Confirm Email | Mantuo 满托",
  "/access/complete": "Access Confirmed | Mantuo 满托",
  "/operations/invites": "邀请码管理｜满托",
  "/operations/funnel": "转化数据｜满托",
  "/operations/content-review": "内容审核｜满托",
};

export function siteTitleForPathname(pathname: string): string {
  if (pathname === "/") return HOME_PAGE_TITLE;

  const staticTitle = STATIC_PAGE_TITLES[pathname];
  if (staticTitle !== undefined) return staticTitle;

  if (pathname.startsWith("/practice/")) return "Online Practice | Mantuo 满托";
  if (pathname.startsWith("/results/")) return "Practice Results | Mantuo 满托";
  if (pathname.startsWith("/collaboration/")) return "Learning Collaboration | Mantuo 满托";

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "exams") {
    const examId = segments[1]?.toLowerCase();
    if (examId !== undefined && EXAM_IDS.includes(examId as (typeof EXAM_IDS)[number])) {
      const examName = examId.toUpperCase();
      const section = segments[2];
      if (section === undefined) return `${examName} Prep | Mantuo 满托`;
      return `${EXAM_PAGE_LABELS[section] ?? "Preparation"} | ${examName} | Mantuo 满托`;
    }
  }

  return HOME_PAGE_TITLE;
}

export function applySiteMetadata(pathname: string): void {
  const title = siteTitleForPathname(pathname);
  document.title = title;

  const openGraphTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (openGraphTitle !== null) openGraphTitle.content = title;
}
