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
      setError("账号服务尚未连接");
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
      .catch(() => { if (active) setError("暂时无法读取账号状态"); });
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
      setError(reason instanceof Error ? reason.message : "退出失败，请稍后重试");
      setSigningOut(false);
    }
  }

  async function exportData() {
    if (services.dataRights?.configured !== true) {
      setRightsError("数据权利服务尚未连接");
      return;
    }
    setExporting(true);
    setRightsError(null);
    try {
      downloadLearningData(await services.dataRights.exportMyLearningData());
    } catch (reason) {
      setRightsError(reason instanceof Error ? reason.message : "导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (services.dataRights?.configured !== true) {
      setRightsError("数据权利服务尚未连接");
      return;
    }
    if (deleteConfirmation !== "删除我的账号") {
      setRightsError("请输入“删除我的账号”完成确认");
      return;
    }
    setDeleting(true);
    setRightsError(null);
    try {
      await services.dataRights.deleteMyAccount(deletePassword);
      navigate("/privacy", { replace: true, state: { accountDeleted: true } });
    } catch (reason) {
      setRightsError(reason instanceof Error ? reason.message : "删除失败，请稍后重试");
      setDeleting(false);
    }
  }

  return (
    <main className="account-page account-overview-page">
      <AccountPageHeader />
      {state === null && error === null && (
        <section className="account-message page-shell" aria-live="polite">
          <LoaderCircle className="account-spinner" aria-hidden="true" />
          <p className="eyebrow">学生账号</p>
          <h1>正在读取账号…</h1>
        </section>
      )}
      {(error !== null || state?.session === null) && (
        <section className="account-message page-shell">
          <ShieldCheck aria-hidden="true" />
          <p className="eyebrow">学生账号</p>
          <h1>请先登录</h1>
          <p>{error ?? "登录后可以查看已绑定的内容权限，并继续自己的学习空间。"}</p>
          <div className="account-message__actions">
            <Link className="button button--primary" to="/login">登录</Link>
            <Link className="button button--secondary" to="/access">验证邀请码</Link>
          </div>
        </section>
      )}
      {state?.session !== null && state !== null && (
        <section className="account-overview page-shell">
          <header>
            <div>
              <p className="eyebrow">你的学习空间 · YOUR LEARNER SPACE</p>
              <h1>账号与内容权限</h1>
              <p>{state.session.email}</p>
            </div>
            <button className="button button--secondary" type="button" onClick={signOut} disabled={signingOut}>
              <LogOut aria-hidden="true" />{signingOut ? "正在退出…" : "退出登录"}
            </button>
          </header>

          <section className="account-entitlements" aria-labelledby="account-entitlements-title">
            <div>
              <p>CONTENT ACCESS</p>
              <h2 id="account-entitlements-title">已解锁的资料产品</h2>
              <span>内容权限与学习数据授权是两件事；冰冰不会因此看到你的作答记录。</span>
            </div>
            {unlockedProducts.length > 0 ? (
              <ul>
                {unlockedProducts.map((product) => (
                  <li key={product.id}>
                    <CheckCircle2 aria-hidden="true" />
                    <div>
                      <strong>{product.title.zh}</strong>
                      <span>{product.title.en}</span>
                      <Link to={product.route!}>{product.actionLabel ?? "打开已解锁资料"}</Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : state.packageIds.length > 0 ? (
              <div className="account-entitlements__empty">
                <MessageSquareWarning aria-hidden="true" />
                <p>权限已经绑定，但暂时没有关联到已发布资料。请联系冰冰核对邀请码内容。</p>
                <Link to="/feedback">报告权限问题</Link>
              </div>
            ) : (
              <div className="account-entitlements__empty">
                <KeyRound aria-hidden="true" />
                <p>当前账号还没有绑定资料权限。</p>
                <Link to="/access">输入邀请码</Link>
              </div>
            )}
          </section>

          <section className="account-data-rights" aria-labelledby="account-data-rights-title">
            <div>
              <p>YOUR DATA · 你的数据</p>
              <h2 id="account-data-rights-title">拿走或删除自己的学习记录</h2>
              <span>导出不会删除数据。删除账号会移除当前活动数据库中的课程、练习、事件、本人反馈和内容权限。</span>
            </div>
            <div className="account-data-rights__controls">
              <button className="button button--secondary" type="button" onClick={() => void exportData()} disabled={exporting || services.dataRights?.configured !== true}>
                <Download aria-hidden="true" />{exporting ? "正在整理…" : "导出 JSON 副本"}
              </button>
              <Link to="/privacy">阅读学生隐私说明</Link>
              {!deleteOpen ? (
                <button className="account-delete-link" type="button" onClick={() => setDeleteOpen(true)}>
                  <Trash2 aria-hidden="true" />删除账号与学习数据
                </button>
              ) : (
                <div className="account-delete-panel">
                  <h3>永久删除账号</h3>
                  <p>先输入当前密码，再输入“删除我的账号”。这个操作不能撤销，内容权限也会一并删除。</p>
                  <label htmlFor="delete-account-password">当前密码</label>
                  <input id="delete-account-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
                  <label htmlFor="delete-account-confirmation">确认文字</label>
                  <input id="delete-account-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="删除我的账号" />
                  <div>
                    <button className="button button--danger" type="button" onClick={() => void deleteAccount()} disabled={deleting}>
                      {deleting ? "正在删除…" : "确认永久删除"}
                    </button>
                    <button className="button button--secondary" type="button" onClick={() => { setDeleteOpen(false); setRightsError(null); }} disabled={deleting}>取消</button>
                  </div>
                </div>
              )}
              {rightsError !== null && <p className="form-error" role="alert">{rightsError}</p>}
            </div>
          </section>

          <div className="account-overview__actions">
            {operatorActive && (
              <Link className="button button--primary" to="/operations/invites"><TicketCheck aria-hidden="true" />邀请码运营</Link>
            )}
            {funnelViewerActive && (
              <Link className="button button--primary" to="/operations/funnel"><BarChart3 aria-hidden="true" />转化看板</Link>
            )}
            {contentReviewerActive && (
              <Link className="button button--primary" to="/operations/content-review"><FileSearch aria-hidden="true" />内容审核台</Link>
            )}
            {services.collaboration?.configured === true && (
              <Link className="button button--primary" to="/account/sharing"><UsersRound aria-hidden="true" />管理数据授权</Link>
            )}
            {services.collaboration?.configured === true && (
              <Link className="button button--secondary" to="/collaboration"><Handshake aria-hidden="true" />老师／家长协作空间</Link>
            )}
            <Link className="button button--primary" to="/library">查看题库与资料</Link>
            <Link className="button button--secondary" to="/exams/tmua/dashboard">进入我的准备</Link>
            <Link className="button button--secondary" to="/feedback"><MessageSquareWarning aria-hidden="true" />纠错与技术反馈</Link>
          </div>
          {error !== null && <p className="form-error" role="alert">{error}</p>}
        </section>
      )}
    </main>
  );
}
