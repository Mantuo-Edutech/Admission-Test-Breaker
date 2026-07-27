import { BarChart3, CheckCircle2, Download, FileSearch, Handshake, KeyRound, LoaderCircle, LogOut, MessageSquareWarning, ShieldCheck, TicketCheck, Trash2, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import type { AccountAccessState } from "../domain.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";
import type { LearningDataExport } from "../../data-rights/domain.js";
import { inviteContentProductsForPackages } from "../../library/content-product-registry.js";

interface AccountPageProps {
  readonly services: AppServices;
}

function downloadLearningData(value: LearningDataExport): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `admission-test-breaker-data-${value.exportedAt.slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function AccountPage({ services }: AccountPageProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<AccountAccessState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rightsError, setRightsError] = useState<string | null>(null);
  const [operatorActive, setOperatorActive] = useState(false);
  const [funnelViewerActive, setFunnelViewerActive] = useState(false);
  const [contentReviewerActive, setContentReviewerActive] = useState(false);
  const account = services.accountAccess;
  const unlockedProducts = inviteContentProductsForPackages(state?.packageIds ?? []);

  useEffect(() => {
    let active = true;
    if (account?.configured !== true) {
      setError("The account service is not connected.");
      return () => { active = false; };
    }
    void account.getAccessState()
      .then((next) => {
        if (!active) return;
        setState(next);
        if (next.session !== null && services.inviteOperations?.configured === true) {
          void services.inviteOperations.getContext()
            .then((context) => { if (active) setOperatorActive(context.active); })
            .catch(() => undefined);
        }
        if (next.session !== null && services.productFunnelAnalytics?.configured === true) {
          void services.productFunnelAnalytics.getContext()
            .then((context) => { if (active) setFunnelViewerActive(context.active); })
            .catch(() => undefined);
        }
        if (next.session !== null && services.contentReviewOperations?.configured === true) {
          void services.contentReviewOperations.getContext()
            .then((context) => { if (active) setContentReviewerActive(context.active); })
            .catch(() => undefined);
        }
      })
      .catch(() => { if (active) setError("Your account status could not be loaded."); });
    return () => { active = false; };
  }, [account, services.contentReviewOperations, services.inviteOperations, services.productFunnelAnalytics]);

  async function signOut() {
    if (account?.configured !== true) return;
    setSigningOut(true);
    setError(null);
    try {
      await account.signOut();
      navigate("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-out failed. Please try again.");
      setSigningOut(false);
    }
  }

  async function exportData() {
    if (services.dataRights?.configured !== true) {
      setRightsError("The data-rights service is not connected.");
      return;
    }
    setExporting(true);
    setRightsError(null);
    try {
      downloadLearningData(await services.dataRights.exportMyLearningData());
    } catch (reason) {
      setRightsError(reason instanceof Error ? reason.message : "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (services.dataRights?.configured !== true) {
      setRightsError("The data-rights service is not connected.");
      return;
    }
    if (deleteConfirmation !== "DELETE MY ACCOUNT") {
      setRightsError('Type “DELETE MY ACCOUNT” to confirm');
      return;
    }
    setDeleting(true);
    setRightsError(null);
    try {
      await services.dataRights.deleteMyAccount(deletePassword);
      navigate("/privacy", { replace: true, state: { accountDeleted: true } });
    } catch (reason) {
      setRightsError(reason instanceof Error ? reason.message : "Deletion failed. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <main className="account-page account-overview-page">
      <AccountPageHeader />
      {state === null && error === null && (
        <section className="account-message page-shell" aria-live="polite">
          <LoaderCircle className="account-spinner" aria-hidden="true" />
          <p className="eyebrow">LEARNER ACCOUNT</p>
          <h1>Loading your account…<small lang="zh-CN">正在读取账号</small></h1>
        </section>
      )}
      {(error !== null || state?.session === null) && (
        <section className="account-message page-shell">
          <ShieldCheck aria-hidden="true" />
          <p className="eyebrow">LEARNER ACCOUNT</p>
          <h1>Sign in to continue<small lang="zh-CN">请先登录</small></h1>
          <p>{error ?? "Sign in to view content access and continue in your learner space."}</p>
          <div className="account-message__actions">
            <Link className="button button--primary" to="/login">Sign in</Link>
            <Link className="button button--secondary" to="/access">Verify invitation code</Link>
          </div>
        </section>
      )}
      {state?.session !== null && state !== null && (
        <section className="account-overview page-shell">
          <header>
            <div>
              <p className="eyebrow">YOUR LEARNER SPACE</p>
              <h1>Account and content access<small lang="zh-CN">账号与内容权限</small></h1>
              <p>{state.session.email}</p>
            </div>
            <button className="button button--secondary" type="button" onClick={signOut} disabled={signingOut}>
              <LogOut aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}
            </button>
          </header>

          <section className="account-entitlements" aria-labelledby="account-entitlements-title">
            <div>
              <p>CONTENT ACCESS</p>
              <h2 id="account-entitlements-title">Unlocked content<small lang="zh-CN">已解锁资料</small></h2>
              <span>Content access does not grant anyone access to your practice data.</span>
            </div>
            {unlockedProducts.length > 0 ? (
              <ul>
                {unlockedProducts.map((product) => (
                  <li key={product.id}>
                    <CheckCircle2 aria-hidden="true" />
                    <div>
                      <strong>{product.title.en}</strong>
                      <span>{product.title.zh}</span>
                      <Link to={product.route!}>Open content</Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : state.packageIds.length > 0 ? (
              <div className="account-entitlements__empty">
                <MessageSquareWarning aria-hidden="true" />
                <p>Access is linked, but no published resource matches it yet. Ask Bingbing to check the invitation package.</p>
                <Link to="/feedback">Report an access problem</Link>
              </div>
            ) : (
              <div className="account-entitlements__empty">
                <KeyRound aria-hidden="true" />
                <p>No content access is linked to this account yet.</p>
                <Link to="/access">Enter invitation code</Link>
              </div>
            )}
          </section>

          <section className="account-data-rights" aria-labelledby="account-data-rights-title">
            <div>
              <p>YOUR DATA</p>
              <h2 id="account-data-rights-title">Export or delete your learning record<small lang="zh-CN">拿走或删除自己的学习记录</small></h2>
              <span>Exporting does not delete data. Account deletion removes courses, practice, events, feedback and content access from the active database.</span>
            </div>
            <div className="account-data-rights__controls">
              <button className="button button--secondary" type="button" onClick={() => void exportData()} disabled={exporting || services.dataRights?.configured !== true}>
                <Download aria-hidden="true" />{exporting ? "Preparing…" : "Export JSON copy"}
              </button>
              <Link to="/privacy">Read student privacy notice</Link>
              {!deleteOpen ? (
                <button className="account-delete-link" type="button" onClick={() => setDeleteOpen(true)}>
                  <Trash2 aria-hidden="true" />Delete account and learning data
                </button>
              ) : (
                <div className="account-delete-panel">
                  <h3>Delete account permanently<small lang="zh-CN">永久删除账号</small></h3>
                  <p>Enter your current password, then type “DELETE MY ACCOUNT”. This cannot be undone and content access will also be removed.</p>
                  <label htmlFor="delete-account-password">Current password</label>
                  <input id="delete-account-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
                  <label htmlFor="delete-account-confirmation">Confirmation text</label>
                  <input id="delete-account-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="DELETE MY ACCOUNT" />
                  <div>
                    <button className="button button--danger" type="button" onClick={() => void deleteAccount()} disabled={deleting}>
                      {deleting ? "Deleting…" : "Delete permanently"}
                    </button>
                    <button className="button button--secondary" type="button" onClick={() => { setDeleteOpen(false); setRightsError(null); }} disabled={deleting}>Cancel</button>
                  </div>
                </div>
              )}
              {rightsError !== null && <p className="form-error" role="alert">{rightsError}</p>}
            </div>
          </section>

          <div className="account-overview__actions">
            {operatorActive && (
              <Link className="button button--primary" to="/operations/invites"><TicketCheck aria-hidden="true" />Invite operations</Link>
            )}
            {funnelViewerActive && (
              <Link className="button button--primary" to="/operations/funnel"><BarChart3 aria-hidden="true" />Journey analytics</Link>
            )}
            {contentReviewerActive && (
              <Link className="button button--primary" to="/operations/content-review"><FileSearch aria-hidden="true" />Content review</Link>
            )}
            {services.collaboration?.configured === true && (
              <Link className="button button--primary" to="/account/sharing"><UsersRound aria-hidden="true" />Manage data sharing</Link>
            )}
            {services.collaboration?.configured === true && (
              <Link className="button button--secondary" to="/collaboration"><Handshake aria-hidden="true" />Teacher / parent collaboration</Link>
            )}
            <Link className="button button--primary" to="/">Choose a test</Link>
            <Link className="button button--secondary" to="/exams/tmua/coverage">TMUA course coverage</Link>
            <Link className="button button--secondary" to="/feedback"><MessageSquareWarning aria-hidden="true" />Report a problem</Link>
          </div>
          {error !== null && <p className="form-error" role="alert">{error}</p>}
        </section>
      )}
    </main>
  );
}
