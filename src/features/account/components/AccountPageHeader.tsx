import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../navigation/components/BrandMark.js";

export function AccountPageHeader() {
  return (
    <header className="site-header page-shell">
      <Link className="site-navigation-header__brand" to="/" aria-label="UK Admission Test Prep home"><BrandMark /></Link>
      <Link className="tmua-hub-page__back" to="/">
        <ArrowLeft aria-hidden="true" />
        Back to tests
      </Link>
    </header>
  );
}
