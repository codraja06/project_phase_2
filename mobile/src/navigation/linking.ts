import { LinkingOptions } from '@react-navigation/native';

export const linking: LinkingOptions<any> = {
  prefixes: ['http://localhost:8081', 'civictrack://'],
  config: {
    screens: {
      AuthRoot: {
        screens: {
          Splash: 'splash',
          CitizenLogin: 'citizen-login',
          CitizenRegister: 'citizen-register',
          AuthorityLogin: 'authority-login',
        },
      },
      CitizenRoot: {
        screens: {
          CitizenTabs: {
            screens: {
              CitizenDashboard: 'citizen/dashboard',
              CivicAssistant: 'citizen/assistance',
              CitizenMap: 'citizen/map',
              ReportIssue: 'citizen/report',
              ComplaintHistory: 'citizen/history',
              Notifications: 'citizen/alerts',
              CitizenProfile: 'citizen/profile',
            },
          },
          ComplaintDetail: 'citizen/complaint/:complaintId',
        },
      },
      AuthorityRoot: {
        screens: {
          AuthorityTabs: {
            screens: {
              AuthorityDashboard: 'authority/dashboard',
              AllComplaints: 'authority/complaints',
              AuthorityMap: 'authority/map',
              AuthorityAnalytics: 'authority/analytics',
              AuthorityNotifications: 'authority/alerts',
              AuthorityProfile: 'authority/profile',
            },
          },
          AuthorityComplaintDetail: 'authority/complaint/:complaintId',
        },
      },
    },
  },
};
