import { LibraryBig } from "lucide-react";
import { Link } from "react-router-dom";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";
import { TMUA_PUBLIC_SUMMARY } from "../tmua-summary.js";

const ONLINE_PAPER_COUNT = TMUA_PUBLIC_SUMMARY.editions.reduce(
  (count, edition) =>
    count + edition.papers.filter((paper) => paper.onlineQuestionCount > 0).length,
  0,
);

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
        <p>18 套历年试卷均已收录。你可以先查看完整目录，再进入已经开放的在线练习。</p>
      </section>

      <section className="tmua-archive page-shell" aria-labelledby="tmua-archive-title">
        <header className="section-heading">
          <p>完整目录 · Collection Status</p>
          <h2 id="tmua-archive-title">18 套试卷已经全部进入资料库</h2>
          <span>“已收录”表示原始 PDF 与来源已经进入资料库；“建设中”表示正在转换、校对为可在线作答的题目。</span>
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
              <strong>{ONLINE_PAPER_COUNT} / {TMUA_PUBLIC_SUMMARY.paperCount}</strong>
              <span>其余正在建设</span>
            </dd>
          </div>
          <div>
            <dt>在线题目</dt>
            <dd>
              <strong>{TMUA_PUBLIC_SUMMARY.publishedQuestionCount} / {TMUA_PUBLIC_SUMMARY.questionShellCount}</strong>
              <span>完成核验后开放</span>
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
                  const published = paper.contentStage === "published";
                  return (
                    <tr key={`${edition.id}-paper-${paper.paper}`}>
                      {paperIndex === 0 && <th scope="rowgroup" rowSpan={2}>{edition.label}</th>}
                      <th scope="row">Paper {paper.paper}</th>
                      <td><span className="archive-stage archive-stage--collected">已收录</span></td>
                      <td>
                        <span className={published ? "archive-stage archive-stage--published" : "archive-stage archive-stage--building"}>
                          {published ? `${paper.onlineQuestionCount} / 20 已开放` : "建设中"}
                        </span>
                      </td>
                      <td>
                        {published ? (
                          <Link to="/practice/tmua-2023-paper-1">进入在线练习</Link>
                        ) : (
                          <span title="试卷已经收录，在线题目正在转换和校对">暂未开放</span>
                        )}
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
          收录不等于直接上线。每道题完成题面、选项、答案与解析核验后，才会开放在线作答。
        </p>
      </section>
    </main>
  );
}
