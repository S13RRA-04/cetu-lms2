import { useState } from 'react';
import { updateMe, changeMyPassword } from '../api/profile.js';
import useAuthStore from '../store/authStore.js';

export default function ProfilePage() {
  const { user, setAuth, accessToken } = useAuthStore();

  const [profile, setProfile] = useState({
    first_name: user?.first_name ?? '',
    last_name:  user?.last_name  ?? '',
  });
  const [profileMsg,  setProfileMsg]  = useState('');
  const [profileErr,  setProfileErr]  = useState('');
  const [savingProf,  setSavingProf]  = useState(false);

  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwdMsg,  setPwdMsg]  = useState('');
  const [pwdErr,  setPwdErr]  = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const handleProfile = async (e) => {
    e.preventDefault();
    setSavingProf(true); setProfileMsg(''); setProfileErr('');
    try {
      const updated = await updateMe({ first_name: profile.first_name, last_name: profile.last_name });
      setAuth({ ...user, ...updated }, accessToken);
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileErr(err.response?.data?.error?.message ?? 'Failed to update profile.');
    } finally { setSavingProf(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setPwdMsg(''); setPwdErr('');
    if (pwd.new_password !== pwd.confirm) { setPwdErr('New passwords do not match.'); return; }
    setSavingPwd(true);
    try {
      await changeMyPassword(pwd.current_password, pwd.new_password);
      setPwdMsg('Password changed successfully.');
      setPwd({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setPwdErr(err.response?.data?.error?.message ?? 'Failed to change password.');
    } finally { setSavingPwd(false); }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      {/* Profile info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Personal Information</h2></div>
        <div className="card-body">
          {profileMsg && <div className="alert alert-success">{profileMsg}</div>}
          {profileErr && <div className="alert alert-error">{profileErr}</div>}
          <div className="form-group">
            <label>Email</label>
            <input value={user?.email ?? ''} disabled style={{ opacity: .6 }} />
            <span className="form-hint">Email cannot be changed.</span>
          </div>
          <div className="form-group">
            <label>Role</label>
            <input value={user?.role ?? ''} disabled style={{ opacity: .6 }} />
          </div>
          <form onSubmit={handleProfile}>
            <div className="grid-2">
              <div className="form-group">
                <label>First Name *</label>
                <input value={profile.first_name} onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input value={profile.last_name} onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))} required />
              </div>
            </div>
            <div className="flex-end">
              <button type="submit" className="btn btn-primary" disabled={savingProf}>{savingProf ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="card-header"><h2>Change Password</h2></div>
        <div className="card-body">
          {pwdMsg && <div className="alert alert-success">{pwdMsg}</div>}
          {pwdErr && <div className="alert alert-error">{pwdErr}</div>}
          <form onSubmit={handlePassword}>
            <div className="form-group">
              <label>Current Password *</label>
              <input type="password" value={pwd.current_password} onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>New Password *</label>
              <input type="password" value={pwd.new_password} onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))} required minLength={8} />
              <span className="form-hint">Minimum 8 characters.</span>
            </div>
            <div className="form-group">
              <label>Confirm New Password *</label>
              <input type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} required minLength={8} />
            </div>
            <div className="flex-end">
              <button type="submit" className="btn btn-primary" disabled={savingPwd}>{savingPwd ? 'Saving…' : 'Change Password'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
