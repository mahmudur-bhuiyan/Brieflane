import { IconFolder, IconUsers } from '../../../components/common/icons';

export const quickLinks = [
  {
    title: 'Projects',
    description: 'Sync from ActiveCollab and manage client details.',
    icon: IconFolder,
    status: 'Available now',
    to: '/projects',
  },
  {
    title: 'Users',
    description: 'Invite Project Managers and manage access.',
    icon: IconUsers,
    status: 'Available now',
    adminOnly: true,
    to: '/users',
  },
];
