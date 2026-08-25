import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SuperAdminRoute } from './components/SuperAdminRoute';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { UsersPage } from './pages/UsersPage';
import { CreateUserPage, EditUserPage } from './pages/UserFormPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route element={<SuperAdminRoute />}>
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/new" element={<CreateUserPage />} />
        <Route path="/users/:id/edit" element={<EditUserPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
