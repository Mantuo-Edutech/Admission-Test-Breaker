export const HOME_PAGE_TITLE = "满托｜英国入学考试练习与诊断";

const EXAM_IDS = ["tmua", "esat", "tara", "lnat", "ucat"] as const;

const EXAM_PAGE_LABELS: Readonly<Record<string, string>> = {
  profile: "课程信息",
  coverage: "知识覆盖",
  dashboard: "我的准备",
  preparation: "我的准备",
  diagnostic: "能力诊断",
  "past-papers": "历年真题",
  record: "学习记录",
  resources: "题库与资料",
  notes: "复习笔记",
};

const STATIC_PAGE_TITLES: Readonly<Record<string, string>> = {
  "/library": "题库与资料｜满托",
  "/access": "邀请码解锁｜满托",
  "/register": "注册｜满托",
  "/login": "登录｜满托",
  "/account": "我的账号｜满托",
  "/account/sharing": "数据授权｜满托",
  "/collaboration": "协作空间｜满托",
  "/collaboration/redeem": "接受学习授权｜满托",
  "/privacy": "隐私与数据权利｜满托",
  "/feedback": "提交反馈｜满托",
  "/forgot-password": "找回密码｜满托",
  "/auth/reset": "重设密码｜满托",
  "/auth/confirm": "确认邮箱｜满托",
  "/access/complete": "解锁完成｜满托",
  "/operations/invites": "邀请码管理｜满托",
  "/operations/funnel": "转化数据｜满托",
  "/operations/content-review": "内容审核｜满托",
};

export function siteTitleForPathname(pathname: string): string {
  if (pathname === "/") return HOME_PAGE_TITLE;

  const staticTitle = STATIC_PAGE_TITLES[pathname];
  if (staticTitle !== undefined) return staticTitle;

  if (pathname.startsWith("/practice/")) return "在线练习｜满托";
  if (pathname.startsWith("/results/")) return "练习结果｜满托";
  if (pathname.startsWith("/collaboration/")) return "学习协作｜满托";

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "exams") {
    const examId = segments[1]?.toLowerCase();
    if (examId !== undefined && EXAM_IDS.includes(examId as (typeof EXAM_IDS)[number])) {
      const examName = examId.toUpperCase();
      const section = segments[2];
      if (section === undefined) return `${examName} 备考｜满托`;
      return `${EXAM_PAGE_LABELS[section] ?? "备考"}｜${examName}｜满托`;
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
