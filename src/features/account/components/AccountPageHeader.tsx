import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../navigation/components/BrandMark.js";

export function AccountPageHeader() {
  return (
    <header className="site-header page-shell">
      <Link className="site-navigation-header__brand" to="/" aria-label="满托考试练习场首页"><BrandMark /></Link>
      <Link className="tmua-hub-page__back" to="/library">
        <ArrowLeft aria-hidden="true" />
        返回题库与资料
      </Link>
    </header>
  );
}
