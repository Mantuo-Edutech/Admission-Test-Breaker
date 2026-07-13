import type { ActorRef } from "../platform/learner-space/domain.js";
import type { LearnerSpaceId } from "../platform/shared/ids.js";

export const LOCAL_DEMO_LEARNER_SPACE_ID: LearnerSpaceId = "lsp_local-demo";
export const LOCAL_DEMO_STUDENT: ActorRef = {
  kind: "student",
  userId: "usr_local-demo",
};
