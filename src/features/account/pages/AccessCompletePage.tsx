import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";
import {
  inviteContentProductsForPackages,
  type ContentProduct,
} from "../../library/content-product-registry.js";

interface AccessCompletePageProps {
  services: AppServices;
}

type AccessVerification = "checking" | "unlocked" | "missing";

export function AccessCompletePage({ services }: AccessCompletePageProps) {
  const [verification, setVerification] = useState<AccessVerification>("checking");
  const [unlockedProducts, setUnlockedProducts] = useState<readonly ContentProduct[]>([]);

  useEffect(() => {
    let active = true;
    const account = services.accountAccess;
    if (account?.configured !== true) {
      setVerification("missing");
      return () => { active = false; };
    }
    void account.getAccessState()
      .then((state) => {
        if (active) {
          const products = inviteContentProductsForPackages(state.packageIds);
          setUnlockedProducts(products);
          setVerification(products.length > 0 ? "unlocked" : "missing");
        }
      })
      .catch(() => { if (active) setVerification("missing"); });
    return () => { active = false; };
  }, [services]);

  return (
    <main className="account-page">
      <AccountPageHeader />
      <section className="account-message page-shell" aria-live="polite">
        {verification === "checking" && <LoaderCircle className="account-spinner" aria-hidden="true" />}
        {verification === "unlocked" && <CheckCircle2 aria-hidden="true" />}
        {verification === "missing" && <TriangleAlert aria-hidden="true" />}
        <p className="eyebrow">账号与权限</p>
        <h1>{verification === "checking" ? "正在确认权限" : verification === "unlocked" ? "内容已解锁" : "尚未找到有效权限"}</h1>
        {verification === "checking" && <p>正在读取当前账号的内容权限…</p>}
        {verification === "unlocked" && (
          <>
            <p>邀请码对应的 {unlockedProducts.length} 项已发布资料已经绑定到你的学生账号。</p>
            <p className="account-message__note"><ShieldCheck aria-hidden="true" />这不会向邀请码提供者开放你的学习记录。</p>
            <div className="account-message__actions">
              {unlockedProducts.map((product, index) => (
                <Link
                  className={`button ${index === 0 ? "button--primary" : "button--secondary"}`}
                  key={product.id}
                  to={product.route!}
                >
                  {product.actionLabel ?? `打开${product.title.zh}`}
                </Link>
              ))}
            </div>
          </>
        )}
        {verification === "missing" && (
          <>
            <p>请先登录并核销有效邀请码；仅打开这个网址不会获得内容权限。</p>
            <Link className="button button--primary" to="/access">验证邀请码</Link>
          </>
        )}
      </section>
    </main>
  );
}
