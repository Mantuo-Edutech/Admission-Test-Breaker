import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../practice/components/BrandMark.js";

export function AccountPageHeader() {
  return (
    <header className="site-header page-shell">
      <BrandMark />
      <Link className="tmua-hub-page__back" to="/exams/tmua/resources">
        <ArrowLeft aria-hidden="true" />
        返回模考与资料
      </Link>
    </header>
  );
}
