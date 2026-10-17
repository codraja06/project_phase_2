import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  CitizenLogin: undefined;
  CitizenRegister: undefined;
  AuthorityLogin: undefined;
};

export type CitizenTabParamList = {
  CivicAssistant: undefined;
  CitizenMap: undefined;
  CitizenDashboard: undefined;
  ReportIssue: { initialCategory?: string } | undefined;
  ComplaintHistory: { filter?: string; search?: string; days?: number } | undefined;
  Notifications: undefined;
  CitizenProfile: undefined;
};

export type CitizenStackParamList = {
  CitizenTabs: NavigatorScreenParams<CitizenTabParamList>;
  ComplaintDetail: { complaintId: string };
};

export type AuthorityTabParamList = {
  AuthorityDashboard: undefined;
  AllComplaints: { filter?: string; from?: string; to?: string; category?: string; search?: string } | undefined;
  AuthorityMap: undefined;
  AuthorityAnalytics: undefined;
  AuthorityNotifications: undefined;
  AuthorityProfile: undefined;
};

export type AuthorityStackParamList = {
  AuthorityTabs: NavigatorScreenParams<AuthorityTabParamList>;
  AuthorityComplaintDetail: { complaintId: string };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Citizen: NavigatorScreenParams<CitizenStackParamList>;
  Authority: NavigatorScreenParams<AuthorityStackParamList>;
};
