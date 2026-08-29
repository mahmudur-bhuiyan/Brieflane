import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/login/LoginPage';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { SuperAdminRoute } from './components/routing/SuperAdminRoute';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { SearchActiveCollabPage } from './pages/projects/SearchActiveCollabPage';
import { ProjectTaskHoursReportPage } from './pages/projects/ProjectTaskHoursReportPage';
import { ProjectUserTaskHoursPage } from './pages/projects/ProjectUserTaskHoursPage';
import { UsersPage } from './pages/users/UsersPage';
import { CreateUserPage } from './pages/users/CreateUserPage';
import { EditUserPage } from './pages/users/EditUserPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ReportArchivePage } from './pages/reports/ReportArchivePage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/search" element={<SearchActiveCollabPage />} />
        <Route path="/projects/:id/task-hours/report" element={<ProjectTaskHoursReportPage />} />
        <Route path="/projects/:id/task-hours" element={<ProjectUserTaskHoursPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/reports" element={<ReportArchivePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route element={<SuperAdminRoute />}>
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/new" element={<CreateUserPage />} />
        <Route path="/users/:id/edit" element={<EditUserPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
