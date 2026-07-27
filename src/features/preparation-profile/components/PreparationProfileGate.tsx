import type { ReactNode } from "react";
import type { AppServices } from "../../../app/dependencies.js";
import { usePreparationProfileContext } from "../hooks/usePreparationProfileContext.js";
import { ProfileRequiredState } from "./ProfileRequiredState.js";

interface PreparationProfileGateProps {
  services: AppServices;
  children: ReactNode;
}

export function PreparationProfileGate({
  services,
  children,
}: PreparationProfileGateProps) {
  const { loading, profile, issue } = usePreparationProfileContext(services);
  if (loading) {
    return (
      <main className="practice-state-page" aria-live="polite">
        <p className="eyebrow">CHECKING YOUR COURSE PROFILE</p>
        <h1>Preparing your paper…<small lang="zh-CN">正在准备练习</small></h1>
      </main>
    );
  }
  if (profile === null) return <ProfileRequiredState issue={issue} />;
  return children;
}
