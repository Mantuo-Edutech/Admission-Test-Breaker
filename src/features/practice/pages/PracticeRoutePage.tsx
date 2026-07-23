import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { ExamPracticeProfileGate } from "../../preparation-profile/components/ExamPracticeProfileGate.js";
import type { DeliveredPracticePaper } from "../delivery/domain.js";
import { resolvePracticeDeliveryService } from "../delivery/resolve-service.js";
import { PracticePage } from "./PracticePage.js";

interface PracticeRoutePageProps {
  services: AppServices;
}

/**
 * Keeps the exam-specific paper registry and profile gates behind the
 * /practice/:paperId route boundary. The public landing page does not need to
 * download hundreds of native questions before a learner opens a paper.
 */
export function PracticeRoutePage({ services }: PracticeRoutePageProps) {
  const { paperId } = useParams();
  const [paper, setPaper] = useState<DeliveredPracticePaper | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setPaper(undefined);
    setLoadFailed(false);
    if (paperId === undefined) {
      setPaper(null);
      return () => { active = false; };
    }
    void resolvePracticeDeliveryService(services.practiceDelivery)
      .then(async (delivery) => delivery?.loadPaper(paperId) ?? null)
      .then((loaded) => {
        if (active) setPaper(loaded);
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setPaper(null);
        }
      });
    return () => { active = false; };
  }, [paperId, services.practiceDelivery]);

  if (paper === undefined) {
    return <main className="practice-state-page" aria-live="polite"><p className="eyebrow">正在读取题目</p><h1>正在准备在线练习…</h1></main>;
  }

  if (loadFailed) {
    return <main className="practice-state-page" role="alert"><p className="eyebrow">PAPER TEMPORARILY UNAVAILABLE</p><h1>试卷暂时无法读取</h1><p>你的练习记录没有丢失，请检查网络后刷新重试。</p></main>;
  }

  return (
    <ExamPracticeProfileGate services={services} paper={paper}>
      <PracticePage services={services} paper={paper} />
    </ExamPracticeProfileGate>
  );
}
