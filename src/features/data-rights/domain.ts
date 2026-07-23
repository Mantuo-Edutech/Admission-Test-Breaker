export interface LearningDataExport {
  readonly schemaVersion: 1 | 2 | 3 | 4;
  readonly exportedAt: string;
  readonly account: {
    readonly email: string;
    readonly platformUserId: string;
    readonly learnerSpaceId: string;
  };
  readonly preparationProfile: unknown;
  readonly practiceSessions: readonly unknown[];
  readonly contentEntitlements: readonly unknown[];
  readonly feedback?: readonly unknown[];
  readonly assessmentBackgroundProfiles?: readonly unknown[];
  readonly collaborationInvites?: readonly unknown[];
  readonly collaborationGrants?: readonly unknown[];
  readonly collaborationArtifacts?: readonly unknown[];
  readonly collaborationAudit?: readonly unknown[];
}

export interface DataRightsService {
  readonly configured: boolean;
  exportMyLearningData(): Promise<LearningDataExport>;
  deleteMyAccount(password: string): Promise<void>;
}
