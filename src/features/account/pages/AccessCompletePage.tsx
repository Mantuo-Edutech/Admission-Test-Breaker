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
        <p className="eyebrow">ACCOUNT ACCESS</p>
        <h1>{verification === "checking" ? "Checking access…" : verification === "unlocked" ? "Content unlocked" : "No valid access found"}</h1>
        {verification === "checking" && <p>Reading content access for this account…</p>}
        {verification === "unlocked" && (
          <>
            <p>{unlockedProducts.length} published {unlockedProducts.length === 1 ? "resource is" : "resources are"} now linked to your learner account.</p>
            <p className="account-message__note"><ShieldCheck aria-hidden="true" />This never gives the code provider access to your learning record.</p>
            <div className="account-message__actions">
              {unlockedProducts.map((product, index) => (
                <Link
                  className={`button ${index === 0 ? "button--primary" : "button--secondary"}`}
                  key={product.id}
                  to={product.route!}
                >
                  {(product.relatedPracticeIds?.length ?? 0) > 0
                    ? "Complete the paper and open the review"
                    : `Open ${product.title.en}`}
                </Link>
              ))}
            </div>
          </>
        )}
        {verification === "missing" && (
          <>
            <p>Sign in and redeem a valid invitation code. Opening this URL alone does not grant access.</p>
            <Link className="button button--primary" to="/access">Verify invitation code</Link>
          </>
        )}
      </section>
    </main>
  );
}
