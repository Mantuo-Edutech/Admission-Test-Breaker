import { LibraryBig } from "lucide-react";
import { Link } from "react-router-dom";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";
import { TMUA_ONLINE_PAPERS } from "../../practice/content/tmua-online-registry.js";
import { TMUA_PUBLIC_SUMMARY } from "../tmua-summary.js";

const onlinePaperById = new Map(TMUA_ONLINE_PAPERS.map((paper) => [paper.id, paper]));

export function TmuaPastPapersPage() {
  return (
    <main className="tmua-stage-page tmua-past-papers-page">
      <TmuaPageHeader backTo="/exams/tmua" backLabel="TMUA 首页" />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">TMUA 历年真题</p>
        <h1>
          历年真题
          <span>Past Papers</span>
        </h1>
        <p>18 套历年试卷均已收录并可在线练习。选择年份后即可计时作答、标记和提交评分。</p>
      </section>

      <section className="tmua-archive page-shell" aria-labelledby="tmua-archive-title">
        <header className="section-heading">
          <p>完整目录 · Collection Status</p>
          <h2 id="tmua-archive-title">18 套试卷全部可以开始练习</h2>
          <span>2023 Paper 1 已完成逐题在线排版；其余试卷使用原版 PDF 与在线答题卡，避免公式转写失真。</span>
        </header>

        <dl className="tmua-archive__summary" aria-label="TMUA 历年真题收录概况">
          <div>
            <dt>试卷收录</dt>
            <dd>
              <strong>{TMUA_PUBLIC_SUMMARY.paperCount} / {TMUA_PUBLIC_SUMMARY.paperCount}</strong>
              <span>全部已收录</span>
            </dd>
          </div>
          <div>
            <dt>在线试卷</dt>
            <dd>
              <strong>{TMUA_ONLINE_PAPERS.length} / {TMUA_PUBLIC_SUMMARY.paperCount}</strong>
              <span>全部可练习</span>
            </dd>
          </div>
          <div>
            <dt>在线题目</dt>
            <dd>
              <strong>{TMUA_PUBLIC_SUMMARY.questionShellCount} / {TMUA_PUBLIC_SUMMARY.questionShellCount}</strong>
              <span>全部可作答与评分</span>
            </dd>
          </div>
        </dl>

        <div className="tmua-archive__table-wrap">
          <table aria-label="TMUA 历年真题资料馆">
            <thead>
              <tr><th>版本</th><th>试卷</th><th>资料状态</th><th>在线练习</th><th>操作</th></tr>
            </thead>
            <tbody>
              {TMUA_PUBLIC_SUMMARY.editions.flatMap((edition) =>
                edition.papers.map((paper, paperIndex) => {
                  const paperId = `tmua-${edition.id}-p${paper.paper}`;
                  const onlinePaper = onlinePaperById.get(paperId);
                  if (onlinePaper === undefined) return null;
                  const structured = paperId === "tmua-2023-p1";
                  return (
                    <tr key={`${edition.id}-paper-${paper.paper}`}>
                      {paperIndex === 0 && <th scope="rowgroup" rowSpan={2}>{edition.label}</th>}
                      <th scope="row">Paper {paper.paper}</th>
                      <td><span className="archive-stage archive-stage--collected">已收录</span></td>
                      <td>
                        <span className="archive-stage archive-stage--published">
                          {structured ? "逐题在线" : "原卷 + 在线答题卡"}
                        </span>
                      </td>
                      <td>
                        <Link to={`/practice/${onlinePaper.id}/start`}>开始练习</Link>
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
        <p className="tmua-archive__note">
          <LibraryBig aria-hidden="true" />
          所有练习均使用已收录原卷和官方答案。原卷模式会把 PDF 直接嵌入页面，作答记录仍保存在你的学习空间。
        </p>
      </section>
    </main>
  );
}
