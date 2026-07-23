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
        <p className="eyebrow">PRIVACY FOR STUDENTS · 学生隐私</p>
        <h1>你的数据属于你<br /><span>Your data belongs to you</span></h1>
        <p>这份说明先回答最重要的问题：我们记录什么、为什么记录、谁能看到，以及你如何拿走或删除自己的数据。</p>
        {accountDeleted && (
          <div className="calm-notice" role="status">
            账号和当前数据库中的学习记录已经删除。我们也已尝试清除这台设备上的学习数据。
          </div>
        )}
      </section>

      <section className="privacy-summary page-shell" aria-label="隐私要点">
        <article>
          <Database aria-hidden="true" />
          <p>01 · WHAT WE KEEP</p>
          <h2>只保存完成学习所需的数据</h2>
          <span>邮箱、考试与课程选择、答案、改答、标记、每题活跃用时、提交结果、本人反馈、内容权限，以及你创建的协作授权与审计。</span>
        </article>
        <article>
          <EyeOff aria-hidden="true" />
          <p>02 · PRIVATE BY DEFAULT</p>
          <h2>默认只有学生本人可见</h2>
          <span>邀请码只解锁内容。老师或家长只能在你逐项选择考试、权限和有效期后查看；冰冰、满托顾问和 Agent 不会自动获得记录。</span>
        </article>
        <article>
          <ShieldCheck aria-hidden="true" />
          <p>03 · YOUR CHOICE</p>
          <h2>导出和删除都在账号内完成</h2>
          <span>你可以取得包含协作授权与审计的 JSON 副本；删除账号前需要重新输入当前密码，避免他人误删。</span>
        </article>
      </section>

      <section className="privacy-details page-shell">
        <article>
          <p className="eyebrow">我们不会主动收集 · WE DO NOT ASK FOR</p>
          <h2>不需要真实姓名、学校、生日或家长联系方式才能做题</h2>
          <p>当前核心练习不需要定位、通讯录、设备指纹或跨站广告追踪。站内反馈只保存你主动填写的内容和当前页面/题号，不自动附加答案，并拒收邮箱和手机号。添加冰冰微信是学生主动选择的服务联系，不会自动与学习记录合并，也不会改变题目和基础结果的可用性。</p>
        </article>
        <article>
          <p className="eyebrow">保存位置 · WHERE IT IS KEPT</p>
          <h2>未登录留在设备；登录后进入本人 Learner Space</h2>
          <p>未登录的课程和练习保存在当前浏览器的随机 Guest Space。登录后，系统把当前设备中较新的记录归入学生自己的私密学习空间，并清除未隔离的本地副本。每个账号的数据在数据库和访问权限层都彼此隔离。</p>
        </article>
        <article>
          <p className="eyebrow">站内产品改进 · FIRST-PARTY PRODUCT COUNTS</p>
          <h2>只统计六个关键动作，不建立学生画像</h2>
          <p>为了判断网站是否真的帮助学生完成路径，产品漏斗只计数：选择考试、完成档案、开始练习、完成练习、主动打开冰冰和邀请码成功。每次浏览器会话使用一个随机 Journey ID；漏斗记录不保存账号、邮箱、IP、设备信息、课程明细、题目答案或任意文字，也不把 Journey ID 连接到 Learner Space。原始计数不向学生或公开页面开放，运营只能查看按考试和动作汇总的数量；生产数据最长保留 90 天。</p>
          <p>与产品漏斗分开，服务器会为防攻击、故障诊断和安全事件调查保留基础访问日志，其中可能包含 IP、请求路径、时间、响应状态、来源页和浏览器信息。当前访问日志按日轮转并保留 14 份，不与 Learner Space 合并，也不用于学习画像或广告。</p>
        </article>
        <article>
          <p className="eyebrow">使用目的 · WHY WE USE IT</p>
          <h2>用于恢复练习、生成事实结果和改进学习工具</h2>
          <p>作答和用时用于恢复会话、显示本人的结果，并在未来样本与隐私门达到要求后形成公平 Benchmark。学习数据不会用于定向广告，也不会出售。付费 AI 解读必须由学生主动发起，并遵守单独的用途、预算和授权记录。</p>
        </article>
        <article>
          <p className="eyebrow">你的权利 · YOUR RIGHTS</p>
          <h2>查看、导出、纠正和删除</h2>
          <p>登录后可在账号页导出学习数据或删除账号。访问、纠正、限制或异议请求也可以通过站内反馈提交给满托服务团队；如对处理结果有疑问，可以继续向英国 ICO 查询数据权利。</p>
          <div className="privacy-actions">
            <Link className="button button--primary" to="/account"><Download aria-hidden="true" />进入账号与数据</Link>
            <Link className="button button--secondary" to="/account/sharing"><ShieldCheck aria-hidden="true" />管理协作授权</Link>
            <Link className="button button--secondary" to="/feedback"><MessageSquareWarning aria-hidden="true" />提交站内反馈</Link>
            <a className="button button--secondary" href="https://ico.org.uk/for-the-public/" target="_blank" rel="noreferrer">查看 ICO 数据权利</a>
          </div>
        </article>
      </section>

      <section className="privacy-delete-note page-shell">
        <Trash2 aria-hidden="true" />
        <div>
          <h2>删除意味着什么 · What deletion means</h2>
          <p>删除账号会从活动数据库中移除账号、课程档案、练习会话、学习事件、本人反馈、内容权限、协作邀请、Grant、协作内容和审计。如果托管服务存在加密备份，备份副本只在既定保留周期内用于灾难恢复，期满自动删除，不能恢复到个人账号。</p>
        </div>
      </section>
    </main>
  );
}
