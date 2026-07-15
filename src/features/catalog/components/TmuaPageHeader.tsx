import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../practice/components/BrandMark.js";

interface TmuaPageHeaderProps {
  backTo: string;
  backLabel: string;
}

export function TmuaPageHeader({ backTo, backLabel }: TmuaPageHeaderProps) {
  return (
    <header className="site-header page-shell">
      <BrandMark />
      <Link className="tmua-hub-page__back" to={backTo}>
        <ArrowLeft aria-hidden="true" />
        {backLabel}
      </Link>
    </header>
  );
}
