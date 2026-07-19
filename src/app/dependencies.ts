import type {
  LearningEventId,
  PracticeSessionId,
} from "../platform/shared/ids.js";
import { LocalGuestSpaceStore } from "../features/guest-space/storage/local-store.js";
import type { GuestSpaceStore } from "../features/guest-space/storage/store.js";
import { LocalPreparationProfileStore } from "../features/preparation-profile/storage/local-store.js";
import type { PreparationProfileStore } from "../features/preparation-profile/storage/store.js";
import { LocalPracticeSessionStore } from "../features/practice/storage/local-store.js";
import type { PracticeSessionStore } from "../features/practice/storage/store.js";
import {
  createAccountAccessService,
  createSupabaseBrowserClient,
} from "../features/account/supabase-account-service.js";
import type { AccountAccessService } from "../features/account/domain.js";
import { SessionPendingInviteStore } from "../features/account/storage/pending-invite.js";
import type { PendingInviteStore } from "../features/account/storage/pending-invite.js";
import { AuthAwarePracticeSessionStore } from "../features/learner-data/auth-aware-practice-store.js";
import { AuthAwarePreparationProfileStore } from "../features/learner-data/auth-aware-profile-store.js";
import type { LearnerDataRepository } from "../features/learner-data/repository.js";
import { SupabaseLearnerDataRepository } from "../features/learner-data/supabase-repository.js";
import type { DataRightsService } from "../features/data-rights/domain.js";
import { SupabaseDataRightsService } from "../features/data-rights/supabase-data-rights-service.js";
import type { EntitledContentService } from "../features/entitled-content/domain.js";
import { SupabaseEntitledContentService } from "../features/entitled-content/supabase-entitled-content-service.js";
import { resolveBrowserConfiguration } from "../platform/runtime-config.js";
import type { FeedbackService } from "../features/feedback/domain.js";
import { SupabaseFeedbackService } from "../features/feedback/supabase-feedback-service.js";
import type { AssessmentProfileStore } from "../features/preparation-profile/storage/assessment-profile-store.js";
import { LocalAssessmentProfileStore } from "../features/preparation-profile/storage/assessment-profile-local-store.js";
import { SupabaseAssessmentProfileStore } from "../features/preparation-profile/storage/supabase-assessment-profile-store.js";
import type { PracticeHistoryReader } from "../features/practice/history/store.js";
import { LocalPracticeHistoryStore } from "../features/practice/history/local-history-store.js";
import { AuthAwarePracticeHistoryReader } from "../features/learner-data/auth-aware-practice-history.js";
import type { ProductFunnelTracker } from "../features/product-funnel/domain.js";
import { LocalFirstProductFunnelTracker } from "../features/product-funnel/local-first-tracker.js";
import { SupabaseProductFunnelSink } from "../features/product-funnel/supabase-sink.js";
import type { ProductFunnelAnalyticsService } from "../features/product-funnel/analytics-domain.js";
import { SupabaseProductFunnelAnalyticsService } from "../features/product-funnel/supabase-analytics-service.js";
import type { InviteOperationsService } from "../features/invite-operations/domain.js";
import { SupabaseInviteOperationsService } from "../features/invite-operations/supabase-invite-operations-service.js";
import type { CollaborationService } from "../features/collaboration/domain.js";
import { SupabaseCollaborationService } from "../features/collaboration/supabase-collaboration-service.js";
import type { ContentReviewOperationsService } from "../features/content-review-operations/domain.js";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AppIdFactory {
  sessionId(): PracticeSessionId;
  eventId(): LearningEventId;
}

export interface AppServices {
  store: PracticeSessionStore;
  guestSpaceStore: GuestSpaceStore;
  profileStore: PreparationProfileStore;
  assessmentProfileStore?: AssessmentProfileStore;
  now(): Date;
  ids: AppIdFactory;
  accountAccess?: AccountAccessService;
  pendingInvite?: PendingInviteStore;
  learnerData?: LearnerDataRepository;
  dataRights?: DataRightsService;
  entitledContent?: EntitledContentService;
  feedback?: FeedbackService;
  practiceHistory?: PracticeHistoryReader;
  funnel?: ProductFunnelTracker;
  productFunnelAnalytics?: ProductFunnelAnalyticsService;
  inviteOperations?: InviteOperationsService;
  collaboration?: CollaborationService;
  contentReviewOperations?: ContentReviewOperationsService;
}

function randomSuffix(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createLazyContentReviewOperationsService(
  client: SupabaseClient,
): ContentReviewOperationsService {
  let delegate: ContentReviewOperationsService | undefined;
  const loadDelegate = async (): Promise<ContentReviewOperationsService> => {
    if (delegate !== undefined) return delegate;
    const { SupabaseContentReviewOperationsService } = await import(
      "../features/content-review-operations/supabase-content-review-operations-service.js"
    );
    delegate = new SupabaseContentReviewOperationsService(client);
    return delegate;
  };
  return {
    configured: true,
    getContext: async () => (await loadDelegate()).getContext(),
    loadSummary: async () => (await loadDelegate()).loadSummary(),
    listQueue: async (campaignId) => (await loadDelegate()).listQueue(campaignId),
  };
}

export function createDefaultAppServices(): AppServices {
  const now = () => new Date();
  const browserOrigin = globalThis.location?.origin ?? "http://127.0.0.1:57145";
  const browserConfiguration = resolveBrowserConfiguration(import.meta.env);
  const supabaseConfiguration = {
    url: browserConfiguration.supabaseUrl,
    publishableKey: browserConfiguration.supabasePublishableKey,
  };
  const supabaseClient = createSupabaseBrowserClient(supabaseConfiguration);
  const localPracticeHistory = new LocalPracticeHistoryStore(globalThis.localStorage, now);
  const localPracticeStore = new LocalPracticeSessionStore(
    globalThis.localStorage,
    now,
    localPracticeHistory,
  );
  const localProfileStore = new LocalPreparationProfileStore(globalThis.localStorage, now);
  const localAssessmentProfileStore = new LocalAssessmentProfileStore(globalThis.localStorage, now);
  const learnerData = supabaseClient === null
    ? undefined
    : new SupabaseLearnerDataRepository(supabaseClient);
  const funnel = new LocalFirstProductFunnelTracker(
    globalThis.localStorage,
    globalThis.sessionStorage,
    now,
    randomSuffix,
    supabaseClient === null ? undefined : new SupabaseProductFunnelSink(supabaseClient),
  );
  return {
    store: learnerData === undefined
      ? localPracticeStore
      : new AuthAwarePracticeSessionStore(localPracticeStore, learnerData),
    practiceHistory: learnerData === undefined
      ? localPracticeHistory
      : new AuthAwarePracticeHistoryReader(localPracticeHistory, learnerData),
    guestSpaceStore: new LocalGuestSpaceStore(
      globalThis.localStorage,
      now,
      randomSuffix,
    ),
    profileStore: learnerData === undefined
      ? localProfileStore
      : new AuthAwarePreparationProfileStore(localProfileStore, learnerData),
    assessmentProfileStore: supabaseClient === null
      ? localAssessmentProfileStore
      : new SupabaseAssessmentProfileStore(localAssessmentProfileStore, supabaseClient),
    now,
    ids: {
      sessionId: () => `ses_${randomSuffix()}`,
      eventId: () => `evt_${randomSuffix()}`,
    },
    accountAccess: createAccountAccessService(
      supabaseConfiguration,
      browserOrigin,
      supabaseClient,
      browserConfiguration.authProtection,
    ),
    pendingInvite: new SessionPendingInviteStore(globalThis.sessionStorage),
    funnel,
    ...(learnerData === undefined ? {} : { learnerData }),
    ...(supabaseClient === null
      ? {}
      : {
          dataRights: new SupabaseDataRightsService(
            supabaseClient,
            globalThis.localStorage,
            globalThis.sessionStorage,
          ),
          entitledContent: new SupabaseEntitledContentService(supabaseClient),
          feedback: new SupabaseFeedbackService(supabaseClient),
          inviteOperations: new SupabaseInviteOperationsService(supabaseClient),
          productFunnelAnalytics: new SupabaseProductFunnelAnalyticsService(supabaseClient),
          collaboration: new SupabaseCollaborationService(supabaseClient),
          contentReviewOperations: createLazyContentReviewOperationsService(supabaseClient),
        }),
  };
}
