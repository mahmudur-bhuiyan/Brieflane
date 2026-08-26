import { useParams } from 'react-router-dom';
import { UserForm } from './components/UserForm';

export function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  return <UserForm mode="edit" userId={id} />;
}
