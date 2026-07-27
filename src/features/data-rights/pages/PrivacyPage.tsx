import { Database, Download, EyeOff, MessageSquareWarning, ShieldCheck, Trash2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AccountPageHeader } from "../../account/components/AccountPageHeader.js";

export function PrivacyPage() {
  const location = useLocation();
  const accountDeleted = Boolean(
    (location.state as { accountDeleted?: boolean } | null)?.accountDeleted,
  );

  return (
    <main className="account-page privacy-page">
      <AccountPageHeader />
      <section className="privacy-hero page-shell">
        <p className="eyebrow">PRIVACY FOR STUDENTS</p>
        <h1>Your data belongs to you<small lang="zh-CN">你的数据属于你</small></h1>
        <p>What we keep, why we keep it, who can see it, and how you can export or delete it.</p>
        {accountDeleted && (
          <div className="calm-notice" role="status">
            Your account and active-database learning records have been deleted. We also attempted to clear learning data on this device.
          </div>
        )}
      </section>

      <section className="privacy-summary page-shell" aria-label="Privacy summary">
        <article>
          <Database aria-hidden="true" />
          <p>01 · WHAT WE KEEP</p>
          <h2>Only what learning requires<small lang="zh-CN">只保存完成学习所需的数据</small></h2>
          <span>Email, exam and course choices, answers, changes, marks, active time, results, your feedback, content access, and collaboration permissions you create.</span>
        </article>
        <article>
          <EyeOff aria-hidden="true" />
          <p>02 · PRIVATE BY DEFAULT</p>
          <h2>Private by default<small lang="zh-CN">默认只有学生本人可见</small></h2>
          <span>An invitation code unlocks content only. A teacher or parent can see data only after you choose the exam, permissions and expiry. Staff and agents receive no automatic access.</span>
        </article>
        <article>
          <ShieldCheck aria-hidden="true" />
          <p>03 · YOUR CHOICE</p>
          <h2>Export or delete from your account<small lang="zh-CN">导出和删除都在账号内完成</small></h2>
          <span>You can download a JSON copy including collaboration grants and audits. Account deletion requires your current password.</span>
        </article>
      </section>

      <section className="privacy-details page-shell">
        <article>
          <p className="eyebrow">WE DO NOT ASK FOR</p>
          <h2>No real name, school, date of birth or parent contact is required<small lang="zh-CN">做题不需要真实姓名、学校、生日或家长联系方式</small></h2>
          <p>Core practice does not require location, contacts, device fingerprinting or cross-site advertising trackers. Feedback stores only what you enter plus the current page or question. Adding Bingbing on WeChat is optional and does not merge your learning record or change free access.</p>
        </article>
        <article>
          <p className="eyebrow">WHERE IT IS KEPT</p>
          <h2>On this device while signed out; in your Learner Space after sign-in<small lang="zh-CN">未登录留在设备；登录后进入本人学习空间</small></h2>
          <p>Signed-out course and practice data stays in a random Guest Space in this browser. After sign-in, newer device records move into your private Learner Space and the unisolated local copy is cleared. Database access controls isolate every account.</p>
        </article>
        <article>
          <p className="eyebrow">FIRST-PARTY PRODUCT COUNTS</p>
          <h2>Six journey events, not a student profile<small lang="zh-CN">只统计六个关键动作，不建立学生画像</small></h2>
          <p>To improve the journey, we count only exam selected, profile completed, practice started, practice completed, guidance opened and invitation redeemed. A random Journey ID stores no account, email, IP, device details, course details, answers or free text, and is not linked to Learner Space. Production counts are retained for up to 90 days.</p>
          <p>Separate security access logs may include IP, request path, time, response status, referrer and browser information for attack prevention and incident diagnosis. They rotate daily, retain 14 copies, and are never merged into a learner profile or used for advertising.</p>
        </article>
        <article>
          <p className="eyebrow">WHY WE USE IT</p>
          <h2>Restore practice, show factual results and improve the tool<small lang="zh-CN">恢复练习、生成事实结果和改进学习工具</small></h2>
          <p>Answers and time restore sessions and show your results. A fair benchmark is introduced only after sample and privacy thresholds are met. Learning data is not sold or used for targeted advertising. Paid AI interpretation must be initiated by the student under a separate purpose, budget and consent record.</p>
        </article>
        <article>
          <p className="eyebrow">YOUR RIGHTS</p>
          <h2>Access, export, correct and delete<small lang="zh-CN">查看、导出、纠正和删除</small></h2>
          <p>After sign-in, export learning data or delete your account from the account page. Submit access, correction, restriction or objection requests through feedback; the UK ICO also explains your data rights.</p>
          <div className="privacy-actions">
            <Link className="button button--primary" to="/account"><Download aria-hidden="true" />Account and data</Link>
            <Link className="button button--secondary" to="/account/sharing"><ShieldCheck aria-hidden="true" />Manage sharing</Link>
            <Link className="button button--secondary" to="/feedback"><MessageSquareWarning aria-hidden="true" />Send feedback</Link>
            <a className="button button--secondary" href="https://ico.org.uk/for-the-public/" target="_blank" rel="noreferrer">ICO data rights</a>
          </div>
        </article>
      </section>

      <section className="privacy-delete-note page-shell">
        <Trash2 aria-hidden="true" />
        <div>
          <h2>What deletion means<small lang="zh-CN">删除意味着什么</small></h2>
          <p>Deleting an account removes the account, course profiles, practice sessions, learning events, feedback, content access, collaboration invitations, grants, collaboration content and audits from the active database. Encrypted hosting backups exist only for disaster recovery, expire on their retention schedule and cannot be restored into an individual account.</p>
        </div>
      </section>
    </main>
  );
}
