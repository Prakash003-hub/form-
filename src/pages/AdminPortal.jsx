import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  getPosts, 
  createPost, 
  updatePost, 
  deletePost,
  getForms, 
  createForm, 
  updateForm, 
  deleteForm,
  getUsersList,
  getSubmissionsByUser,
  adminUpdateSubmission,
  uploadOutputPdf,
  adminUploadDoc,
  adminDeleteDoc,
  deleteSubmission,
  deleteUserAndSubmissions,
  uploadPostImage
} from '../services/db';
import { 
  Plus, 
  Trash2, 
  Edit, 
  FileText, 
  Settings, 
  Users, 
  Eye, 
  Save, 
  Check, 
  X, 
  ChevronRight, 
  Search, 
  ArrowUpDown,
  Upload,
  ExternalLink,
  ChevronDown,
  Home,
  ArrowLeft,
  Download
} from 'lucide-react';

const safeJsonParse = (str, fallback = []) => {
  if (!str) return fallback;
  try {
    if (typeof str === 'object') return str;
    return JSON.parse(str);
  } catch (e) {
    console.error("JSON parse error:", e, str);
    return fallback;
  }
};

export default function AdminPortal() {
  // Tab states bound to URL search params
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'posts';
  const setActiveTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };
  
  // Lists
  const [posts, setPosts] = useState([]);
  const [forms, setForms] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Selected user details (Aadhaar click)
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSubmissions, setUserSubmissions] = useState([]);
  const [activeSubmission, setActiveSubmission] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [uploadingPdfId, setUploadingPdfId] = useState(null);
  const [uploadingDocType, setUploadingDocType] = useState(null); // 'receipt' | 'certificate' | 'other' | null
  const [uploadingPostImg, setUploadingPostImg] = useState(false);

  // Filters & search
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // Post Editor states
  const [editingPostId, setEditingPostId] = useState(null);
  const [postForm, setPostForm] = useState({ title: '', description: '', img_url: '', apply_url: '' });
  
  // Form Builder states
  const [editingFormId, setEditingFormId] = useState(null);
  const [formBuilder, setFormBuilder] = useState({
    title: '',
    description: '',
    category: 'E sevai',
    fee: 0,
    instructions: '',
    required_fields: [], // List of standard field IDs
    required_docs: [],   // List of default doc IDs ('photo', 'aadhar', etc)
    custom_docs: [],     // List of custom doc upload labels
    fields: []           // Any extra custom inputs
  });
  
  // Submission Editor states
  const [editingResponses, setEditingResponses] = useState({});
  const [isEditingResponsesMode, setIsEditingResponsesMode] = useState(false);
  const [statusForm, setStatusForm] = useState({
    payment_status: 'unpaid',
    progress_percent: 0,
    progress_desc: '',
    info_request_label: '',
    info_request_type: 'text',
    other_doc_name: ''
  });
  
  // Secure Admin Login state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('whatsbro_admin_logged') === 'true';
  });
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');

  const handleAdminLoginSubmit = (e) => {
    e.preventDefault();
    setAdminAuthError('');
    if (adminPassword === '131003') {
      sessionStorage.setItem('whatsbro_admin_logged', 'true');
      setIsAdminLoggedIn(true);
    } else {
      setAdminAuthError('Invalid passcode. Access Denied.');
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('whatsbro_admin_logged');
    setIsAdminLoggedIn(false);
    setAdminUsername('');
    setAdminPassword('');
  };

  async function fetchInitialData() {
    setLoading(true);
    try {
      const postsData = await getPosts();
      const formsData = await getForms();
      const usersData = await getUsersList();
      setPosts(postsData);
      setForms(formsData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
      alert('Failed to connect to Python FastAPI backend. Make sure it is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleRefreshUsers = async () => {
    try {
      const usersData = await getUsersList();
      setUsers(usersData);
      if (selectedUser) {
        const latestUser = usersData.find(u => u.aadhar === selectedUser.aadhar);
        if (latestUser) {
          setSelectedUser(latestUser);
        }
        const subsData = await getSubmissionsByUser(selectedUser.aadhar);
        setUserSubmissions(subsData);
        // Sync active submission if it's selected
        if (activeSubmission) {
          const updatedActive = subsData.find(s => s.id === activeSubmission.id);
          setActiveSubmission(updatedActive || null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostImageUpload = async (file) => {
    if (!file) return;
    setUploadingPostImg(true);
    try {
      const res = await uploadPostImage(file);
      setPostForm(prev => ({ ...prev, img_url: res.img_url }));
      alert('Post image uploaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingPostImg(false);
    }
  };

  // --- POSTS OPERATIONS ---
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPostId) {
        await updatePost(editingPostId, postForm);
        alert('Post updated successfully!');
      } else {
        await createPost(postForm);
        alert('New post added successfully!');
      }
      setPostForm({ title: '', description: '', img_url: '', apply_url: '' });
      setEditingPostId(null);
      const postsData = await getPosts();
      setPosts(postsData);
    } catch (err) {
      console.error(err);
      alert('Failed to save post.');
    }
  };

  const startEditPost = (post) => {
    setEditingPostId(post.id);
    setPostForm({
      title: post.title,
      description: post.description || '',
      img_url: post.img_url || '',
      apply_url: post.apply_url || ''
    });
    // Scroll to editor form
    document.getElementById('post-editor-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(id);
      setPosts(posts.filter(p => p.id !== id));
      alert('Post deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete post.');
    }
  };

  // --- FORM BUILDER OPERATIONS ---
  const addFieldToBuilder = () => {
    const newField = {
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      options: []
    };
    setFormBuilder({ ...formBuilder, fields: [...formBuilder.fields, newField] });
  };

  const updateFieldInBuilder = (index, key, val) => {
    const fieldsCopy = [...formBuilder.fields];
    if (key === 'options') {
      fieldsCopy[index][key] = val.split(',').map(o => o.trim()).filter(Boolean);
    } else {
      fieldsCopy[index][key] = val;
    }
    setFormBuilder({ ...formBuilder, fields: fieldsCopy });
  };

  const removeFieldFromBuilder = (index) => {
    const fieldsCopy = formBuilder.fields.filter((_, i) => i !== index);
    setFormBuilder({ ...formBuilder, fields: fieldsCopy });
  };

  const handleFormBuilderSubmit = async (e) => {
    e.preventDefault();
    if (formBuilder.required_fields.length === 0 && formBuilder.fields.length === 0) {
      alert('Please select at least one standard field or add a custom question.');
      return;
    }
    
    const hasEmptyLabels = formBuilder.fields.some(f => !f.label.trim());
    if (hasEmptyLabels) {
      alert('All custom questions must have a valid label.');
      return;
    }

    const payload = {
      title: formBuilder.title,
      description: formBuilder.description,
      category: formBuilder.category,
      fee: parseInt(formBuilder.fee) || 0,
      instructions: formBuilder.instructions,
      required_fields: JSON.stringify(formBuilder.required_fields),
      required_docs: JSON.stringify(formBuilder.required_docs),
      custom_docs: JSON.stringify(formBuilder.custom_docs),
      fields: JSON.stringify(formBuilder.fields)
    };

    try {
      if (editingFormId) {
        await updateForm(editingFormId, payload);
        alert('Form template updated successfully!');
      } else {
        await createForm(payload);
        alert('New Form template created!');
      }
      resetFormBuilder();
      const formsData = await getForms();
      setForms(formsData);
    } catch (err) {
      console.error(err);
      alert('Failed to save form template.');
    }
  };

  const startEditForm = (form) => {
    setEditingFormId(form.id);
    setFormBuilder({
      title: form.title,
      description: form.description || '',
      category: form.category,
      fee: form.fee || 0,
      instructions: form.instructions || '',
      required_fields: safeJsonParse(form.required_fields),
      required_docs: safeJsonParse(form.required_docs),
      custom_docs: safeJsonParse(form.custom_docs),
      fields: safeJsonParse(form.fields)
    });
    document.getElementById('form-builder-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteForm = async (id) => {
    if (!window.confirm('Delete this form template? This will also delete all user submissions associated with this form!')) return;
    try {
      await deleteForm(id);
      setForms(forms.filter(f => f.id !== id));
      alert('Form template deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete form.');
    }
  };

  const resetFormBuilder = () => {
    setEditingFormId(null);
    setFormBuilder({
      title: '',
      description: '',
      category: 'E sevai',
      fee: 0,
      instructions: '',
      required_fields: [],
      required_docs: [],
      custom_docs: [],
      fields: []
    });
  };

  // --- USER & SUBMISSIONS OPERATIONS ---
  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setActiveSubmission(null);
    setIsEditingResponsesMode(false);
    try {
      const subs = await getSubmissionsByUser(user.aadhar);
      setUserSubmissions(subs);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch user submissions.');
    }
  };

  const handleSelectSubmission = (sub) => {
    setActiveSubmission(sub);
    setEditingResponses(safeJsonParse(sub.responses, {}));
    setIsEditingResponsesMode(false);
    setStatusForm({
      payment_status: sub.payment_status,
      progress_percent: sub.progress_percent,
      progress_desc: sub.progress_desc || '',
      info_request_label: sub.info_request_label || '',
      info_request_type: sub.info_request_type || 'text',
      other_doc_name: sub.other_doc_name || ''
    });
    // Auto smooth-scroll to dashboard on mobile screens
    setTimeout(() => {
      document.getElementById('active-submission-dashboard')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      const updated = await adminUpdateSubmission(activeSubmission.id, statusForm);
      alert('Submission status updated successfully!');
      setActiveSubmission(updated);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const handleEditSubmissionResponses = async () => {
    try {
      const payload = { responses: JSON.stringify(editingResponses) };
      const updated = await adminUpdateSubmission(activeSubmission.id, payload);
      alert('User entry data modified successfully!');
      setActiveSubmission(updated);
      setIsEditingResponsesMode(false);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to update user entry data.');
    }
  };

  const handleUploadOutputPdf = async (subId, file) => {
    if (!file) return;
    setUploadingPdfId(subId);
    try {
      const updated = await uploadOutputPdf(subId, file);
      alert('Finished document PDF uploaded successfully! Application marked 100% complete.');
      setActiveSubmission(updated);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to upload PDF document.');
    } finally {
      setUploadingPdfId(null);
    }
  };

  const handleUploadDocAdmin = async (subId, docType, file) => {
    if (!file) return;
    setUploadingDocType(docType);
    try {
      const updated = await adminUploadDoc(subId, docType, file);
      alert(`Official ${docType} uploaded successfully!`);
      setActiveSubmission(updated);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert(`Failed to upload ${docType}.`);
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleDeleteDocAdmin = async (subId, docType) => {
    if (!window.confirm(`Are you sure you want to delete the uploaded ${docType}?`)) return;
    try {
      const updated = await adminDeleteDoc(subId, docType);
      alert(`${docType} deleted successfully!`);
      setActiveSubmission(updated);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert(`Failed to delete ${docType}.`);
    }
  };

  const handleDeleteSubmission = async (subId) => {
    if (!window.confirm('Are you sure you want to delete this submission record?')) return;
    try {
      await deleteSubmission(subId);
      alert('Submission deleted.');
      setActiveSubmission(null);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete submission.');
    }
  };

  const handleDeleteUser = async (aadhar) => {
    if (!window.confirm(`Are you sure you want to delete this user (Aadhaar: ${aadhar}) and all their application forms?`)) return;
    try {
      await deleteUserAndSubmissions(aadhar);
      alert('User account and submissions deleted completely.');
      setSelectedUser(null);
      setActiveSubmission(null);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    }
  };

  // Filters users based on Search Term (Aadhaar or Phone matches)
  const filteredUsers = users.filter(u => 
    u.phone.includes(userSearchTerm) || u.aadhar.includes(userSearchTerm)
  );

  if (!isAdminLoggedIn) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '70vh',
        padding: '24px',
        background: 'transparent'
      }}>
        <div className="premium-card" style={{
          width: '100%',
          maxWidth: '360px',
          borderTop: '6px solid var(--primary)',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#ffffff',
          borderRadius: '16px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-light-main)', margin: 0 }}>
              WhatsBro Admin Console
            </h3>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '6px', marginBottom: 0 }}>
              Access restricted to authorized portal administrators.
            </p>
          </div>

          {adminAuthError && (
            <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px', color: '#991b1b', fontSize: '0.75rem' }}>
              {adminAuthError}
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="premium-input-group" style={{ marginBottom: 0 }}>
              <label className="premium-label">Enter Admin Passcode *</label>
              <input 
                type="password" 
                placeholder="Enter 6-digit passcode"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                className="premium-input"
                style={{ padding: '12px 16px', fontSize: '0.95rem', letterSpacing: '0.1em', textAlign: 'center' }}
              />
            </div>

            <button
              type="submit"
              className="premium-btn premium-btn-primary"
              style={{ padding: '11px', fontSize: '0.85rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '8px' }}
            >
              Verify Credentials
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Secure Console Terminal Status Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0f172a', color: 'white', borderRadius: '12px', margin: '16px 16px 0 16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>WhatsBro Admin Terminal</span>
        </div>
        <button 
          onClick={handleAdminLogout}
          style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Logout Admin
        </button>
      </div>
      <div style={{ flex: 1, padding: '0 16px' }}>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '16px 0' }}>
          <button
            onClick={() => setActiveTab('posts')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: activeTab === 'posts' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
              background: activeTab === 'posts' ? 'rgba(16,185,129,0.06)' : 'white',
              cursor: 'pointer',
              fontWeight: activeTab === 'posts' ? 800 : 600
            }}
          >
            Posts
          </button>

          <button
            onClick={() => setActiveTab('forms')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: activeTab === 'forms' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
              background: activeTab === 'forms' ? 'rgba(16,185,129,0.06)' : 'white',
              cursor: 'pointer',
              fontWeight: activeTab === 'forms' ? 800 : 600
            }}
          >
            Form Templates
          </button>

          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: activeTab === 'users' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
              background: activeTab === 'users' ? 'rgba(16,185,129,0.06)' : 'white',
              cursor: 'pointer',
              fontWeight: activeTab === 'users' ? 800 : 600
            }}
          >
            Users
          </button>
        </div>
        {/* --- TAB 1: MANAGE POSTS --- */}
        {activeTab === 'posts' && (
          <div className="desktop-grid-2">
            
            {/* Post Add Form */}
            <div className="premium-card" id="post-editor-form" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                {editingPostId ? 'Edit Post Details' : 'Add New Service Post'}
              </h3>
              <form onSubmit={handlePostSubmit}>
                <div className="premium-input-group">
                  <label className="premium-label">Service Title</label>
                  <input 
                    type="text" 
                    value={postForm.title} 
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} 
                    placeholder="e.g. Income Certificate Online"
                    className="premium-input" 
                    required 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Description (Instagram Caption)</label>
                  <textarea 
                    rows={4}
                    value={postForm.description} 
                    onChange={(e) => setPostForm({ ...postForm, description: e.target.value })} 
                    placeholder="Provide details about the service, processing time, required documents..."
                    className="premium-input" 
                    required 
                  />
                </div>

                 <div className="premium-input-group">
                  <label className="premium-label">Post Banner Image (Optional)</label>
                  
                  {postForm.img_url && (
                    <div style={{ marginBottom: '10px', position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      <img 
                        src={`http://localhost:8000${postForm.img_url}`} 
                        alt="Uploaded preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f8fafc' }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setPostForm(prev => ({ ...prev, img_url: '' }))} 
                        className="premium-btn premium-btn-danger"
                        style={{ position: 'absolute', right: '6px', bottom: '6px', width: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
                      >
                        Remove Image
                      </button>
                    </div>
                  )}

                  <label className="premium-btn premium-btn-secondary" style={{ padding: '12px', fontSize: '0.85rem', display: 'flex', gap: '8px', cursor: 'pointer', background: 'white', border: '1.5px dashed var(--primary)' }}>
                    <Upload size={16} style={{ color: 'var(--primary)' }} /> 
                    {uploadingPostImg ? 'Uploading image...' : postForm.img_url ? 'Change Uploaded Image' : 'Upload Local Image File'}
                    <input 
                      type="file" 
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploadingPostImg}
                      onChange={(e) => handlePostImageUpload(e.target.files[0])}
                    />
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', display: 'block', marginTop: '6px' }}>
                    Select a local PNG or JPG file. Standard web URL inputs are not allowed.
                  </span>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Apply Now URL / Routing (Optional)</label>
                  <input 
                    type="text" 
                    value={postForm.apply_url} 
                    onChange={(e) => setPostForm({ ...postForm, apply_url: e.target.value })} 
                    placeholder="e.g. /user?tab=apply&category=E%20sevai"
                    className="premium-input" 
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                    Use local routes (e.g. `/user?tab=apply&category=E sevai`) or full web links. <strong>Leave blank to hide the "Apply Now" button on this post.</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="premium-btn premium-btn-primary" style={{ flex: 2 }}>
                    {editingPostId ? 'Update Post' : 'Publish Post'}
                  </button>
                  {editingPostId && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingPostId(null); setPostForm({ title: '', description: '', img_url: '', apply_url: '' }) }} 
                      className="premium-btn premium-btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List of existing posts */}
            <div>
              <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 16px', color: 'var(--text-light-muted)' }}>
                Active Posts Feed ({posts.length} Posts)
              </h4>
              {posts.map((post) => (
                <div key={post.id} className="premium-card admin-item-card" style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{post.title}</h4>
                    <p className="text-muted" style={{ fontSize: '0.8rem', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => startEditPost(post)} className="premium-btn premium-btn-secondary" style={{ width: '36px', height: '36px', padding: 0 }} title="Edit Post">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeletePost(post.id)} className="premium-btn premium-btn-danger" style={{ width: '36px', height: '36px', padding: 0 }} title="Delete Post">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* --- TAB 2: FORM TEMPLATES BUILDER --- */}
        {activeTab === 'forms' && (
          <div className="desktop-grid-2">
            
            {/* Form Builder panel */}
            <div className="premium-card" id="form-builder-panel" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>
                {editingFormId ? 'Edit Form Template' : 'Google Forms Builder'}
              </h3>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '16px' }}>Configure custom inputs for your users. Phone, DOB, and Aadhaar are automatically required.</p>
              
              <form onSubmit={handleFormBuilderSubmit}>
                <div className="premium-input-group">
                  <label className="premium-label">Form Title</label>
                  <input 
                    type="text" 
                    value={formBuilder.title} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, title: e.target.value })} 
                    placeholder="e.g. New Voter ID Card"
                    className="premium-input" 
                    required 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Form Description</label>
                  <textarea 
                    rows={2}
                    value={formBuilder.description} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, description: e.target.value })} 
                    placeholder="Instruction for users when filling this form..."
                    className="premium-input" 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Form Category</label>
                  <select 
                    value={formBuilder.category} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, category: e.target.value })}
                    className="premium-input"
                  >
                    <option value="E sevai">E Sevai</option>
                    <option value="pan card">PAN Card</option>
                    <option value="voter id">Voter ID</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Service Fee (Receipt Amount in INR) *</label>
                  <input 
                    type="number" 
                    value={formBuilder.fee} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, fee: parseInt(e.target.value) || 0 })} 
                    placeholder="e.g. 50"
                    className="premium-input" 
                    required 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Instructions / Terms & Conditions (Step 1 - one item per line)</label>
                  <textarea 
                    rows={3}
                    value={formBuilder.instructions} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, instructions: e.target.value })} 
                    placeholder="e.g. Applicant must reside in Tamil Nadu.&#10;Must upload original Aadhaar card."
                    className="premium-input" 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Select Required Fields</label>
                  
                  {formBuilder.required_fields.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px', background: 'rgba(16,185,129,0.06)', border: '1.5px solid var(--primary)', borderRadius: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', width: '100%' }}>Currently Selected Required Fields ({formBuilder.required_fields.length}):</span>
                      {formBuilder.required_fields.map(fieldId => {
                        const label = [
                          { id: 'name', label: 'Name (English)' },
                          { id: 'name_tamil', label: 'பெயர் ( தமிழில் )' },
                          { id: 'dob', label: 'Date of Birth (DOB)' },
                          { id: 'phone', label: 'Phone no' },
                          { id: 'aadhar', label: 'Aadhaar no' },
                          { id: 'gender', label: 'Gender' },
                          { id: 'marital_status', label: 'Status (married/unmarried)' },
                          { id: 'father_name', label: "Father's Name" },
                          { id: 'father_name_tamil', label: 'தந்தை பெயர் ( தமிழில் )' },
                          { id: 'mother_name', label: "Mother's name" },
                          { id: 'mother_name_tamil', label: 'தாயின் பெயர் ( தமிழில் )' },
                          { id: 'community', label: 'Community' },
                          { id: 'address', label: 'Address' },
                          { id: 'religion', label: 'Religion' },
                          { id: 'state', label: 'State' },
                          { id: 'district', label: 'District' },
                          { id: 'taluk', label: 'Taluk' },
                          { id: 'revenue_village', label: 'Revenue Village ( பாஞ்சாயத்து )' },
                          { id: 'street_name', label: 'Street Name' },
                          { id: 'door_no', label: 'Door no' },
                          { id: 'pincode', label: 'Pin Code' }
                        ].find(x => x.id === fieldId)?.label || fieldId;
                        
                        return (
                          <span key={fieldId} className="badge badge-info" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'var(--primary)', color: 'white' }}>
                            {label}
                            <X 
                              size={12} 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => {
                                setFormBuilder(prev => ({
                                  ...prev,
                                  required_fields: prev.required_fields.filter(x => x !== fieldId)
                                }));
                              }}
                            />
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="admin-fields-grid" style={{ display: 'grid', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    {[
                      { id: 'name', label: 'Name (English)' },
                      { id: 'name_tamil', label: 'பெயர் ( தமிழில் )' },
                      { id: 'dob', label: 'Date of Birth (DOB)' },
                      { id: 'phone', label: 'Phone no' },
                      { id: 'aadhar', label: 'Aadhaar no' },
                      { id: 'gender', label: 'Gender' },
                      { id: 'marital_status', label: 'Status (married/unmarried)' },
                      { id: 'father_name', label: "Father's Name" },
                      { id: 'father_name_tamil', label: 'தந்தை பெயர் ( தமிழில் )' },
                      { id: 'mother_name', label: "Mother's name" },
                      { id: 'mother_name_tamil', label: 'தாயின் பெயர் ( தமிழில் )' },
                      { id: 'community', label: 'Community' },
                      { id: 'address', label: 'Address' },
                      { id: 'religion', label: 'Religion' },
                      { id: 'state', label: 'State' },
                      { id: 'district', label: 'District' },
                      { id: 'taluk', label: 'Taluk' },
                      { id: 'revenue_village', label: 'Revenue Village ( பாஞ்சாயத்து )' },
                      { id: 'street_name', label: 'Street Name' },
                      { id: 'door_no', label: 'Door no' },
                      { id: 'pincode', label: 'Pin Code' }
                    ].map(f => {
                      const isChecked = formBuilder.required_fields.includes(f.id);
                      return (
                        <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', color: '#1e293b' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              const list = e.target.checked 
                                ? [...formBuilder.required_fields, f.id]
                                : formBuilder.required_fields.filter(x => x !== f.id);
                              setFormBuilder({ ...formBuilder, required_fields: list });
                            }}
                          />
                          <span>{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Select Document Uploads</label>
                  
                  {formBuilder.required_docs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px', background: 'rgba(16,185,129,0.06)', border: '1.5px solid var(--primary)', borderRadius: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', width: '100%' }}>Currently Selected Documents ({formBuilder.required_docs.length}):</span>
                      {formBuilder.required_docs.map(docId => {
                        const label = [
                          { id: 'photo', label: 'Photo Upload (image < 7MB)' },
                          { id: 'aadhar', label: 'Aadhaar Upload (img/pdf < 5MB)' },
                          { id: 'smart_card', label: 'Smart Card Upload (img/pdf < 5MB)' },
                          { id: 'voter_id', label: 'Voter ID Upload (img/pdf < 5MB)' },
                          { id: 'signature', label: 'Signature Upload (img/pdf < 5MB)' }
                        ].find(x => x.id === docId)?.label || docId;
                        
                        return (
                          <span key={docId} className="badge badge-info" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'var(--primary)', color: 'white' }}>
                            {label}
                            <X 
                              size={12} 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => {
                                setFormBuilder(prev => ({
                                  ...prev,
                                  required_docs: prev.required_docs.filter(x => x !== docId)
                                }));
                              }}
                            />
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '12px' }}>
                    {[
                      { id: 'photo', label: 'Photo Upload (image < 7MB)' },
                      { id: 'aadhar', label: 'Aadhaar Upload (img/pdf < 5MB)' },
                      { id: 'smart_card', label: 'Smart Card Upload (img/pdf < 5MB)' },
                      { id: 'voter_id', label: 'Voter ID Upload (img/pdf < 5MB)' },
                      { id: 'signature', label: 'Signature Upload (img/pdf < 5MB)' }
                    ].map(d => {
                      const isChecked = formBuilder.required_docs.includes(d.id);
                      return (
                        <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', color: '#1e293b' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              const list = e.target.checked 
                                ? [...formBuilder.required_docs, d.id]
                                : formBuilder.required_docs.filter(x => x !== d.id);
                              setFormBuilder({ ...formBuilder, required_docs: list });
                            }}
                          />
                          <span>{d.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b' }}>Custom Uploads Required</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setFormBuilder({ ...formBuilder, custom_docs: [...formBuilder.custom_docs, ''] });
                        }}
                        className="premium-btn premium-btn-success"
                        style={{ padding: '2px 8px', fontSize: '0.7rem', width: 'auto' }}
                      >
                        + Add Custom Label
                      </button>
                    </div>
                    {formBuilder.custom_docs.map((docLabel, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                        <input 
                          type="text" 
                          placeholder="e.g. Self Declaration Form" 
                          value={docLabel}
                          onChange={(e) => {
                            const list = [...formBuilder.custom_docs];
                            list[idx] = e.target.value;
                            setFormBuilder({ ...formBuilder, custom_docs: list });
                          }}
                          className="premium-input"
                          style={{ padding: '6px', fontSize: '0.8rem' }}
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const list = formBuilder.custom_docs.filter((_, i) => i !== idx);
                            setFormBuilder({ ...formBuilder, custom_docs: list });
                          }}
                          className="premium-btn premium-btn-danger"
                          style={{ width: '28px', height: '28px', padding: 0 }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question fields list */}
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.9rem' }}>Form Fields ({formBuilder.fields.length})</h4>
                    <button 
                      type="button" 
                      onClick={addFieldToBuilder} 
                      className="premium-btn premium-btn-success"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
                    >
                      <Plus size={14} /> Add Input Question
                    </button>
                  </div>

                  {formBuilder.fields.map((field, idx) => (
                    <div key={field.id} className="premium-card form-builder-question" style={{ margin: '0 0 12px 0', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>Field #{idx + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => removeFieldFromBuilder(idx)}
                          className="premium-btn premium-btn-danger"
                          style={{ width: '28px', height: '28px', padding: 0 }}
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="premium-input-group" style={{ marginBottom: '8px' }}>
                        <label className="premium-label">Question Label</label>
                        <input 
                          type="text" 
                          value={field.label}
                          onChange={(e) => updateFieldInBuilder(idx, 'label', e.target.value)}
                          placeholder="e.g. Enter Annual Income"
                          className="premium-input"
                          style={{ padding: '8px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label className="premium-label">Input Type</label>
                          <select 
                            value={field.type}
                            onChange={(e) => updateFieldInBuilder(idx, 'type', e.target.value)}
                            className="premium-input"
                            style={{ padding: '8px' }}
                          >
                            <option value="text">Text Input</option>
                            <option value="textarea">Textarea Box</option>
                            <option value="number">Number Box</option>
                            <option value="date">Date picker</option>
                            <option value="select">Dropdown Select</option>
                            <option value="tel">Phone/Mobile Input</option>
                            <option value="checkbox">Multiple Checkbox Options</option>
                            <option value="radio">Radio Button Selection</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-end', height: '36px' }}>
                          <input 
                            type="checkbox" 
                            id={`req-${field.id}`}
                            checked={field.required}
                            onChange={(e) => updateFieldInBuilder(idx, 'required', e.target.checked)}
                          />
                          <label htmlFor={`req-${field.id}`} style={{ fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Required</label>
                        </div>
                      </div>

                      {['select', 'checkbox', 'radio'].includes(field.type) && (
                        <div className="premium-input-group" style={{ marginBottom: 0 }}>
                          <label className="premium-label">Options (comma-separated)</label>
                          <input 
                            type="text"
                            value={field.options ? field.options.join(', ') : ''}
                            onChange={(e) => updateFieldInBuilder(idx, 'options', e.target.value)}
                            placeholder="Option 1, Option 2, Option 3"
                            className="premium-input"
                            style={{ padding: '8px' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="premium-btn premium-btn-primary" style={{ flex: 2 }}>
                    {editingFormId ? 'Update Template' : 'Save Form Template'}
                  </button>
                  <button 
                    type="button" 
                    onClick={resetFormBuilder} 
                    className="premium-btn premium-btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            {/* View Form Templates */}
            <div>
              <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 16px', color: 'var(--text-light-muted)' }}>
                Configured Templates ({forms.length} Templates)
              </h4>
              {forms.map((form) => (
                <div key={form.id} className="premium-card admin-item-card" style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <span className="badge badge-info">{form.category}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', fontWeight: 600 }}>{safeJsonParse(form.fields).length} custom fields</span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '2px' }}>{form.title}</h4>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>{form.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => startEditForm(form)} className="premium-btn premium-btn-secondary" style={{ width: '36px', height: '36px', padding: 0 }} title="Edit Template">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteForm(form.id)} className="premium-btn premium-btn-danger" style={{ width: '36px', height: '36px', padding: 0 }} title="Delete Template">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* --- TAB 3: USER SUBMISSIONS --- */}
        {activeTab === 'users' && (
          <div>
            {!selectedUser ? (
              // Submissions list sorted by preference
              <div className="premium-card" style={{ borderTop: '6px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>User Registrations Manager</h3>
                  <div style={{ position: 'relative', width: '260px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light-muted)' }}><Search size={14} /></span>
                    <input 
                      type="text" 
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      placeholder="Search Phone / Aadhaar..." 
                      className="premium-input" 
                      style={{ paddingLeft: '32px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-light)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div className="admin-table-header" style={{ display: 'flex', background: '#f1f5f9', padding: '10px 16px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light-muted)', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ flex: 2 }}>AADHAAR CARD NO</span>
                    <span style={{ flex: 1.5 }}>PHONE NUMBER</span>
                    <span style={{ flex: 1.5 }}>DATE OF BIRTH</span>
                    <span style={{ flex: 1.5 }}>LAST SUBMITTED</span>
                    <span style={{ width: '80px', textAlign: 'center' }}>ACTIONS</span>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="text-center" style={{ padding: '30px 20px', color: 'var(--text-light-muted)' }}>
                      No user submissions matched your search query.
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div key={user.aadhar} className="admin-user-row" style={{ fontSize: '0.85rem' }}>
                        <span style={{ flex: 2, fontWeight: 700 }}>
                          {user.aadhar.replace(/(\d{4})/g, '$1 ').trim()}
                        </span>
                        <span style={{ flex: 1.5, color: '#475569' }}>{user.phone}</span>
                        <span style={{ flex: 1.5, color: '#475569' }}>{user.dob}</span>
                        <span style={{ flex: 1.5, color: '#64748b', fontSize: '0.75rem' }}>
                          {new Date(user.last_active).toLocaleString()}
                        </span>
                        <div className="admin-user-actions" style={{ width: '80px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleSelectUser(user)} 
                            className="premium-btn premium-btn-primary" 
                            style={{ width: '28px', height: '28px', padding: 0, borderRadius: '6px' }}
                            title="View User Forms"
                          >
                            <Eye size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.aadhar)} 
                            className="premium-btn premium-btn-danger" 
                            style={{ width: '28px', height: '28px', padding: 0, borderRadius: '6px' }}
                            title="Delete User & Forms"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // Specific User Submissions View
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-light)', marginBottom: '16px' }}>
                  <button onClick={() => setSelectedUser(null)} className="premium-btn premium-btn-secondary" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h3 style={{ fontSize: '1rem' }}>User: Aadhaar {selectedUser.aadhar.replace(/(\d{4})/g, '$1 ').trim()}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>Phone: {selectedUser.phone} | DOB: {selectedUser.dob}</p>
                  </div>
                </div>

                {/* Stored Profile Documents Grid */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', width: '100%', color: '#334155' }}>Citizen Profile Stored Documents:</span>
                  {[
                    { id: 'photo', label: 'Photo', url1: selectedUser.photo_url },
                    { id: 'aadhar', label: 'Aadhaar', url1: selectedUser.aadhar_url_1, url2: selectedUser.aadhar_url_2 },
                    { id: 'smart_card', label: 'Smart Card', url1: selectedUser.smart_card_url_1, url2: selectedUser.smart_card_url_2 },
                    { id: 'voter_id', label: 'Voter ID', url1: selectedUser.voter_id_url_1, url2: selectedUser.voter_id_url_2 },
                    { id: 'signature', label: 'Signature', url1: selectedUser.signature_url_1 }
                  ].map(doc => {
                    if (!doc.url1) return null;
                    return (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{doc.label}:</span>
                        <a href={`http://${window.location.hostname}:8000${doc.url1}`} target="_blank" rel="noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '700' }}>File 1</a>
                        {doc.url2 && <a href={`http://${window.location.hostname}:8000${doc.url2}`} target="_blank" rel="noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '700', marginLeft: '4px' }}>File 2</a>}
                      </div>
                    );
                  })}
                  {![selectedUser.photo_url, selectedUser.aadhar_url_1, selectedUser.smart_card_url_1, selectedUser.voter_id_url_1, selectedUser.signature_url_1].some(Boolean) && (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No profile documents uploaded yet.</span>
                  )}
                </div>

                <div className="desktop-grid-2">
                  
                  {/* Left Column: List of submissions by this user */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginBottom: '10px' }}>Submitted Application Forms ({userSubmissions.length})</h4>
                    {userSubmissions.map((sub) => {
                      const associatedFormName = forms.find(f => f.id === sub.form_id)?.title || 'Custom Application';
                      return (
                        <div 
                          key={sub.id} 
                          onClick={() => handleSelectSubmission(sub)}
                          className="premium-card" 
                          style={{ 
                            cursor: 'pointer', 
                            borderLeft: activeSubmission?.id === sub.id ? '5px solid var(--primary)' : '1px solid rgba(0,0,0,0.06)',
                            background: activeSubmission?.id === sub.id ? '#f1f5f9' : 'white',
                            margin: '0 0 12px 0'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>ID: {sub.id}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {sub.uploaded_pdf_url ? (
                                <span className="badge badge-success" style={{ backgroundColor: '#10b981' }}>Received (Delivered)</span>
                              ) : sub.info_request_label && !sub.info_request_response ? (
                                <span className="badge badge-warning" style={{ backgroundColor: '#f59e0b' }}>Awaiting User Upload</span>
                              ) : sub.info_request_label && sub.info_request_response ? (
                                <span className="badge badge-info" style={{ backgroundColor: '#3b82f6' }}>Response Received</span>
                              ) : sub.payment_status === 'paid' ? (
                                <span className="badge badge-success">Paid</span>
                              ) : sub.payment_screenshot ? (
                                <span className="badge badge-warning">Verify Screenshot</span>
                              ) : (
                                <span className="badge badge-danger">Unpaid</span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubmission(sub.id);
                                }}
                                className="premium-btn premium-btn-danger"
                                style={{ width: '26px', height: '26px', padding: 0, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Delete Submission"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          <h4 style={{ fontSize: '0.95rem' }}>{associatedFormName}</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                            <span>Progress: {sub.progress_percent}%</span>
                            <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Active submission details, edits, and status dashboard */}
                  {activeSubmission ? (
                    <div className="premium-card" id="active-submission-dashboard" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '14px' }}>
                        <h4 style={{ fontSize: '1rem' }}>Application Dashboard</h4>
                        <button 
                          onClick={() => handleDeleteSubmission(activeSubmission.id)} 
                          className="premium-btn premium-btn-danger"
                          style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          <Trash2 size={12} /> Delete Form
                        </button>
                      </div>

                      {/* Unified Form values View / Edit */}
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Form Entry Values</h4>
                          <button 
                            onClick={() => setIsEditingResponsesMode(!isEditingResponsesMode)}
                            className="premium-btn premium-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.7rem', width: 'auto' }}
                          >
                            {isEditingResponsesMode ? 'Cancel Edit' : 'Edit Entries'}
                          </button>
                        </div>

                        {/* Expandable Screenshot Preview */}
                        {activeSubmission.payment_screenshot && (
                          <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                            <span className="premium-label" style={{ fontSize: '0.75rem' }}>Uploaded Payment Proof:</span>
                            <div style={{ marginTop: '4px', position: 'relative' }}>
                              <img 
                                src={`http://localhost:8000${activeSubmission.payment_screenshot}`} 
                                alt="UPI Screenshot" 
                                style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                              />
                              <a 
                                href={`http://localhost:8000${activeSubmission.payment_screenshot}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ position: 'absolute', right: '8px', bottom: '8px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                View full <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        )}

                        {isEditingResponsesMode ? (
                          // Form Edit entries Form
                          <div>
                            {Object.entries(editingResponses).map(([fieldId, val]) => (
                              <div key={fieldId} className="premium-input-group" style={{ marginBottom: '10px' }}>
                                <label className="premium-label" style={{ fontSize: '0.75rem' }}>{fieldId}</label>
                                <input 
                                  type="text" 
                                  value={Array.isArray(val) ? val.join(', ') : val}
                                  onChange={(e) => setEditingResponses({ ...editingResponses, [fieldId]: e.target.value })}
                                  className="premium-input"
                                  style={{ padding: '8px', fontSize: '0.85rem' }}
                                />
                              </div>
                            ))}
                            <button 
                              onClick={handleEditSubmissionResponses}
                              className="premium-btn premium-btn-success"
                              style={{ padding: '8px', fontSize: '0.8rem', marginTop: '6px' }}
                            >
                              <Save size={14} /> Save Modified Values
                            </button>
                          </div>
                        ) : (
                          // Normal entries View
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                            {Object.entries(editingResponses).map(([fieldId, val]) => (
                              <div key={fieldId} className="admin-detail-row">
                                <span className="text-muted">{fieldId}:</span>
                                <span style={{ fontWeight: 700, maxWidth: '60%', textAlign: 'right' }}>
                                  {Array.isArray(val) ? val.join(', ') : val}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Combined Visual Documents Explorer (Default Profile + Current Application) */}
                      <div style={{ marginTop: '14px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <span className="premium-label" style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', color: 'var(--primary)', marginBottom: '12px' }}>
                          Combined Application & Citizen Profile Documents
                        </span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* 1. Citizen Profile Default Documents */}
                          {(() => {
                            const profileDocs = [
                              { id: 'photo', label: 'Photo Upload', scope: 'Profile Default', urls: selectedUser.photo_url ? [selectedUser.photo_url] : [] },
                              { id: 'aadhar', label: 'Aadhaar Upload', scope: 'Profile Default', urls: [selectedUser.aadhar_url_1, selectedUser.aadhar_url_2].filter(Boolean) },
                              { id: 'smart_card', label: 'Smart Card Upload', scope: 'Profile Default', urls: [selectedUser.smart_card_url_1, selectedUser.smart_card_url_2].filter(Boolean) },
                              { id: 'voter_id', label: 'Voter ID Upload', scope: 'Profile Default', urls: [selectedUser.voter_id_url_1, selectedUser.voter_id_url_2].filter(Boolean) },
                              { id: 'signature', label: 'Signature Upload', scope: 'Profile Default', urls: selectedUser.signature_url_1 ? [selectedUser.signature_url_1] : [] }
                            ].filter(d => d.urls.length > 0);

                            // 2. Submission Specific Documents
                            let submissionDocs = [];
                            if (activeSubmission.uploaded_docs) {
                              try {
                                const parsedDocs = JSON.parse(activeSubmission.uploaded_docs);
                                submissionDocs = Object.entries(parsedDocs).map(([docKey, urls]) => {
                                  if (!urls || urls.length === 0) return null;
                                  // Clean up the key label
                                  const displayLabel = docKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                  return {
                                    id: docKey,
                                    label: displayLabel,
                                    scope: 'This Application',
                                    urls: urls
                                  };
                                }).filter(Boolean);
                              } catch (e) {
                                console.error(e);
                              }
                            }

                            const allDocs = [...profileDocs, ...submissionDocs];

                            if (allDocs.length === 0) {
                              return <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No documents uploaded in profile or application.</p>;
                            }

                            return allDocs.map((doc, docIdx) => (
                              <div key={`${doc.id}-${docIdx}`} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{doc.label}</span>
                                    <span className={`badge ${doc.scope === 'This Application' ? 'badge-info' : 'badge-success'}`} style={{ fontSize: '0.65rem', padding: '2px 6px', marginLeft: '6px' }}>
                                      {doc.scope}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>{doc.urls.length} {doc.urls.length > 1 ? 'Files' : 'File'}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {doc.urls.map((url, urlIdx) => {
                                    const isPdf = url.toLowerCase().endsWith('.pdf');
                                    const fullUrl = `http://${window.location.hostname}:8000${url}`;
                                    const fileLabel = doc.urls.length > 1 ? `Part {urlIdx + 1}` : 'Document File';
                                    
                                    return (
                                      <div key={urlIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          {/* Mini Display Thumbnail */}
                                          {isPdf ? (
                                            <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                              <FileText size={18} />
                                            </div>
                                          ) : (
                                            <div style={{ width: '38px', height: '38px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <img src={fullUrl} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                          )}
                                          <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>{doc.urls.length > 1 ? `Part ${urlIdx + 1}` : 'Document File'}</span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px' }}>
                                          <a 
                                            href={fullUrl} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="premium-btn premium-btn-secondary" 
                                            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                          >
                                            <Eye size={11} /> View
                                          </a>
                                          <a 
                                            href={fullUrl} 
                                            download 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="premium-btn premium-btn-success" 
                                            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                          >
                                            <Download size={11} /> Download
                                          </a>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Info Request Response View */}
                      {activeSubmission.info_request_label && (
                        <div style={{ marginTop: '14px', padding: '14px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a', marginBottom: '20px' }}>
                          <span className="premium-label" style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', color: '#b45309', marginBottom: '6px' }}>
                            Requested Info: "{activeSubmission.info_request_label}"
                          </span>
                          {activeSubmission.info_request_response ? (
                            <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                              <span style={{ color: '#475569', display: 'block', fontSize: '0.7rem', fontWeight: '600', marginBottom: '4px' }}>User Response:</span>
                              {activeSubmission.info_request_response.startsWith('/uploads/') ? (() => {
                                const fileUrl = `http://${window.location.hostname}:8000${activeSubmission.info_request_response}`;
                                const isPdf = activeSubmission.info_request_response.toLowerCase().endsWith('.pdf');
                                
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      {/* Mini Thumbnail / PDF Icon Preview */}
                                      {isPdf ? (
                                        <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                          <FileText size={18} />
                                        </div>
                                      ) : (
                                        <div style={{ width: '38px', height: '38px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <img src={fileUrl} alt="User Uploaded Response" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                      )}
                                      
                                      <div style={{ textAlign: 'left' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: 'bold', display: 'block' }}>User Uploaded File</span>
                                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{isPdf ? 'PDF Document' : 'Image Upload'}</span>
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <a 
                                        href={fileUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="premium-btn premium-btn-secondary" 
                                        style={{ width: 'auto', padding: '6px 10px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                      >
                                        <Eye size={11} /> View
                                      </a>
                                      <a 
                                        href={fileUrl} 
                                        download 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="premium-btn premium-btn-success" 
                                        style={{ width: 'auto', padding: '6px 10px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                      >
                                        <Download size={11} /> Download
                                      </a>
                                    </div>
                                  </div>
                                );
                              })() : (
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px', fontWeight: '700', color: '#1e293b' }}>
                                  {activeSubmission.info_request_response}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Awaiting response from citizen...</span>
                          )}
                        </div>
                      )}

                      {/* Status / PDF upload controller dashboard */}
                      <form onSubmit={handleUpdateStatus} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '12px' }}>Update Status Panel</h4>

                        <div className="premium-input-group">
                          <label className="premium-label">Payment Status</label>
                          <select 
                            value={statusForm.payment_status}
                            onChange={(e) => setStatusForm({ ...statusForm, payment_status: e.target.value })}
                            className="premium-input"
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>

                        <div className="premium-input-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label className="premium-label" style={{ margin: 0 }}>Progress Percentage</label>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{statusForm.progress_percent}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            value={statusForm.progress_percent}
                            onChange={(e) => setStatusForm({ ...statusForm, progress_percent: parseInt(e.target.value) })}
                            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                          />
                        </div>

                        <div className="premium-input-group">
                          <label className="premium-label">Progress Update Description</label>
                          <textarea 
                            rows={3}
                            value={statusForm.progress_desc}
                            onChange={(e) => setStatusForm({ ...statusForm, progress_desc: e.target.value })}
                            placeholder="Describe current stage e.g. Documents verified, pending government signature."
                            className="premium-input"
                          />
                        </div>

                        <div className="premium-input-group" style={{ background: '#fffbeb', padding: '12px', borderRadius: '10px', border: '1px solid #fde68a', margin: '14px 0' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#b45309', display: 'block', marginBottom: '8px' }}>Request Extra Info / Document from User</span>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label className="premium-label" style={{ fontSize: '0.75rem', color: '#78350f' }}>Request Label (Leave blank if none)</label>
                            <input 
                              type="text" 
                              value={statusForm.info_request_label}
                              onChange={(e) => setStatusForm({ ...statusForm, info_request_label: e.target.value })}
                              placeholder="e.g. Please upload parent's Income Certificate"
                              className="premium-input"
                              style={{ padding: '8px', fontSize: '0.8rem', background: 'white' }}
                            />
                          </div>

                          <div>
                            <label className="premium-label" style={{ fontSize: '0.75rem', color: '#78350f' }}>Request Type</label>
                            <select 
                              value={statusForm.info_request_type}
                              onChange={(e) => setStatusForm({ ...statusForm, info_request_type: e.target.value })}
                              className="premium-input"
                              style={{ padding: '8px', fontSize: '0.8rem', background: 'white' }}
                            >
                              <option value="text">Text Input</option>
                              <option value="file">File Upload (Image/PDF)</option>
                            </select>
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          className="premium-btn premium-btn-primary"
                          style={{ marginBottom: '16px' }}
                        >
                          Update Status
                        </button>
                      </form>

                      {/* Branded Deliverables Section (Receipt, Certificate, Others) */}
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '800', marginBottom: '4px' }}>Deliver Application Documents</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', margin: 0 }}>Attach receipts, certificates, or additional files for this submission. The user will be able to view and download them immediately on the status screen.</p>
                        </div>
                        
                        {/* 1. Official Receipt Upload */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155', display: 'block' }}>1. Official Receipt Document</span>
                          
                          {activeSubmission.receipt_url ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d1fae5', padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid #a7f3d0' }}>
                              <span style={{ color: '#065f46', fontWeight: 600 }}>📩 Receipt Loaded ({activeSubmission.receipt_url.split('.').pop().toUpperCase()})</span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <a href={`http://localhost:8000${activeSubmission.receipt_url}`} target="_blank" rel="noreferrer" style={{ color: '#047857', fontWeight: 800, textDecoration: 'underline' }}>View</a>
                                <button type="button" onClick={() => handleDeleteDocAdmin(activeSubmission.id, 'receipt')} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Delete</button>
                              </div>
                            </div>
                          ) : (
                            <label className="premium-btn premium-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1.5px dashed #cbd5e1' }}>
                              <Upload size={14} style={{ color: 'var(--primary)' }} /> 
                              {uploadingDocType === 'receipt' ? 'Uploading...' : 'Upload Receipt (PDF/Image)'}
                              <input 
                                type="file" 
                                accept="application/pdf,image/*"
                                style={{ display: 'none' }}
                                disabled={uploadingDocType !== null}
                                onChange={(e) => handleUploadDocAdmin(activeSubmission.id, 'receipt', e.target.files[0])}
                              />
                            </label>
                          )}
                        </div>

                        {/* 2. Official Certificate Upload */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155', display: 'block' }}>2. Official Certificate / Outcome</span>
                          
                          {activeSubmission.certificate_url ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d1fae5', padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid #a7f3d0' }}>
                              <span style={{ color: '#065f46', fontWeight: 600 }}>📩 Certificate Loaded ({activeSubmission.certificate_url.split('.').pop().toUpperCase()})</span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <a href={`http://localhost:8000${activeSubmission.certificate_url}`} target="_blank" rel="noreferrer" style={{ color: '#047857', fontWeight: 800, textDecoration: 'underline' }}>View</a>
                                <button type="button" onClick={() => handleDeleteDocAdmin(activeSubmission.id, 'certificate')} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Delete</button>
                              </div>
                            </div>
                          ) : (
                            <label className="premium-btn premium-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1.5px dashed #cbd5e1' }}>
                              <Upload size={14} style={{ color: 'var(--primary)' }} /> 
                              {uploadingDocType === 'certificate' ? 'Uploading...' : 'Upload Certificate (PDF/Image)'}
                              <input 
                                type="file" 
                                accept="application/pdf,image/*"
                                style={{ display: 'none' }}
                                disabled={uploadingDocType !== null}
                                onChange={(e) => handleUploadDocAdmin(activeSubmission.id, 'certificate', e.target.files[0])}
                              />
                            </label>
                          )}
                        </div>

                        {/* 3. Other/Additional Document Upload */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155', display: 'block' }}>
                            3. {activeSubmission.other_doc_name || 'Other / Additional Document'}
                          </span>
                          
                          {/* Label input field */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Custom Document Name:</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input 
                                type="text"
                                value={statusForm.other_doc_name}
                                onChange={(e) => setStatusForm({ ...statusForm, other_doc_name: e.target.value })}
                                placeholder="e.g. Aadhaar Copy, Voter Form"
                                className="premium-input"
                                style={{ padding: '6px 10px', fontSize: '0.75rem', margin: 0, flex: 1 }}
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const updated = await adminUpdateSubmission(activeSubmission.id, { other_doc_name: statusForm.other_doc_name });
                                    alert('Document label saved successfully!');
                                    setActiveSubmission(updated);
                                    handleRefreshUsers();
                                  } catch (e) {
                                    alert('Failed to save document label.');
                                  }
                                }}
                                className="premium-btn premium-btn-success"
                                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                Save Label
                              </button>
                            </div>
                          </div>

                          {activeSubmission.other_doc_url ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d1fae5', padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid #a7f3d0', marginTop: '4px' }}>
                              <span style={{ color: '#065f46', fontWeight: 600 }}>📩 Document Loaded ({activeSubmission.other_doc_url.split('.').pop().toUpperCase()})</span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <a href={`http://localhost:8000${activeSubmission.other_doc_url}`} target="_blank" rel="noreferrer" style={{ color: '#047857', fontWeight: 800, textDecoration: 'underline' }}>View</a>
                                <button type="button" onClick={() => handleDeleteDocAdmin(activeSubmission.id, 'other')} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Delete</button>
                              </div>
                            </div>
                          ) : (
                            <label className="premium-btn premium-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1.5px dashed #cbd5e1', marginTop: '4px' }}>
                              <Upload size={14} style={{ color: 'var(--primary)' }} /> 
                              {uploadingDocType === 'other' ? 'Uploading...' : 'Upload Document (PDF/Image)'}
                              <input 
                                type="file" 
                                accept="application/pdf,image/*"
                                style={{ display: 'none' }}
                                disabled={uploadingDocType !== null}
                                onChange={(e) => handleUploadDocAdmin(activeSubmission.id, 'other', e.target.files[0])}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="premium-card text-center" style={{ alignSelf: 'center', padding: '30px' }}>
                      <FileText size={48} className="text-muted" style={{ margin: '0 auto 10px auto' }} />
                      <h4 style={{ fontSize: '0.95rem' }}>Select an Application</h4>
                      <p className="text-muted" style={{ fontSize: '0.75rem' }}>Click an application on the left side to see details, edit fields, update status progress, upload output PDFs, or delete record.</p>
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
