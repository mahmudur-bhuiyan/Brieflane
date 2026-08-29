import { IconFolder, IconUsers } from '../../../components/common/icons';

export const quickLinks = [
  {
    title: 'Projects',
    description: 'Manage client details and task-hour reports.',
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
