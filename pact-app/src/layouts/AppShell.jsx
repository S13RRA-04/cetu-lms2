import { useEffect, useState } from 'react';
import { getAssignments, getMyEnrollment } from '../api/pact.js';
import AppLayout from './AppLayout.jsx';

export default function AppShell() {
  const [assignments, setAssignments] = useState([]);
  const [enrollment,  setEnrollment]  = useState(null);

  useEffect(() => {
    Promise.all([getAssignments(), getMyEnrollment().catch(() => null)])
      .then(([raw, enroll]) => {
        setAssignments(Array.isArray(raw) ? raw : (raw.data ?? []));
        setEnrollment(enroll);
      })
      .catch(() => {});
  }, []);

  return <AppLayout assignments={assignments} enrollment={enrollment} />;
}
