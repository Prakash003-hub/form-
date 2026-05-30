const API_URL = `http://${window.location.hostname}:8000/api`;

// --- POSTS SERVICE ---
export const getPosts = async () => {
  const response = await fetch(`${API_URL}/posts`);
  if (!response.ok) throw new Error('Failed to fetch posts');
  return response.json();
};

export const createPost = async (postData) => {
  const response = await fetch(`${API_URL}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData)
  });
  if (!response.ok) throw new Error('Failed to create post');
  return response.json();
};

export const updatePost = async (id, postData) => {
  const response = await fetch(`${API_URL}/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData)
  });
  if (!response.ok) throw new Error('Failed to update post');
  return response.json();
};

export const deletePost = async (id) => {
  const response = await fetch(`${API_URL}/posts/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete post');
  return response.json();
};

export const uploadPostImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/posts/upload-image`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) throw new Error('Failed to upload post image');
  return response.json();
};


// --- FORMS SERVICE ---
export const getForms = async () => {
  const response = await fetch(`${API_URL}/forms`);
  if (!response.ok) throw new Error('Failed to fetch forms');
  return response.json();
};

export const getFormById = async (id) => {
  const response = await fetch(`${API_URL}/forms/${id}`);
  if (!response.ok) throw new Error('Form not found');
  return response.json();
};

export const createForm = async (formData) => {
  const response = await fetch(`${API_URL}/forms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  if (!response.ok) throw new Error('Failed to create form');
  return response.json();
};

export const updateForm = async (id, formData) => {
  const response = await fetch(`${API_URL}/forms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  if (!response.ok) throw new Error('Failed to update form');
  return response.json();
};

export const deleteForm = async (id) => {
  const response = await fetch(`${API_URL}/forms/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete form');
  return response.json();
};


// --- SUBMISSIONS SERVICE ---
export const submitFormResponse = async (formId, phone, dob, aadhar, responses) => {
  const response = await fetch(`${API_URL}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      form_id: formId,
      phone,
      dob,
      aadhar,
      responses: JSON.stringify(responses)
    })
  });
  if (!response.ok) throw new Error('Failed to submit form');
  return response.json();
};

export const getUserStatus = async (phone, dob, aadhar) => {
  let url = `${API_URL}/submissions/user-status?dob=${encodeURIComponent(dob)}`;
  if (phone) url += `&phone=${encodeURIComponent(phone)}`;
  if (aadhar) url += `&aadhar=${encodeURIComponent(aadhar)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch status');
  }
  return response.json();
};

// --- USER PROFILE SERVICES ---
export const registerUser = async (userData) => {
  const response = await fetch(`${API_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Registration failed');
  }
  return response.json();
};

export const loginUser = async (loginData) => {
  const response = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginData)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Login failed');
  }
  return response.json();
};

export const updateUserProfile = async (userId, profileData) => {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update profile');
  }
  return response.json();
};

export const uploadUserDocument = async (userId, docType, file1, file2 = null) => {
  const formData = new FormData();
  formData.append('file1', file1);
  if (file2) {
    formData.append('file2', file2);
  }
  
  const response = await fetch(`${API_URL}/users/${userId}/upload-doc/${docType}`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload user document');
  }
  return response.json();
};

export const deleteUserDocument = async (userId, docType) => {
  const response = await fetch(`${API_URL}/users/${userId}/document/${docType}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to delete user document');
  }
  return response.json();
};

export const uploadSubmissionDocument = async (subId, docKey, file1, file2 = null) => {
  const formData = new FormData();
  formData.append('file1', file1);
  if (file2) {
    formData.append('file2', file2);
  }
  
  const response = await fetch(`${API_URL}/submissions/${subId}/upload-doc/${docKey}`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload document');
  }
  return response.json();
};

export const uploadPaymentScreenshot = async (subId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/submissions/${subId}/upload-screenshot`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) throw new Error('Failed to upload payment proof');
  return response.json();
};

export const uploadOutputPdf = async (subId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/submissions/${subId}/upload-pdf`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) throw new Error('Failed to upload final document');
  return response.json();
};

export const adminUploadDoc = async (subId, docType, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/submissions/${subId}/upload-doc-admin/${docType}`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) throw new Error(`Failed to upload ${docType}`);
  return response.json();
};

export const adminDeleteDoc = async (subId, docType) => {
  const response = await fetch(`${API_URL}/submissions/${subId}/delete-doc-admin/${docType}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error(`Failed to delete ${docType}`);
  return response.json();
};


export const getUsersList = async () => {
  const response = await fetch(`${API_URL}/submissions/users`);
  if (!response.ok) throw new Error('Failed to fetch users list');
  return response.json();
};

export const getSubmissionsByUser = async (aadhar) => {
  const response = await fetch(`${API_URL}/submissions/by-user/${aadhar}`);
  if (!response.ok) throw new Error('Failed to fetch user submissions');
  return response.json();
};

export const adminUpdateSubmission = async (subId, updateData) => {
  const response = await fetch(`${API_URL}/submissions/${subId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
  if (!response.ok) throw new Error('Failed to update submission');
  return response.json();
};

export const deleteSubmission = async (subId) => {
  const response = await fetch(`${API_URL}/submissions/${subId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete submission');
  return response.json();
};

export const deleteUserAndSubmissions = async (aadhar) => {
  const response = await fetch(`${API_URL}/submissions/users/${aadhar}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete user');
  return response.json();
};

export const submitInfoRequestResponse = async (subId, valueOrFile, isFile = false) => {
  if (isFile) {
    const formData = new FormData();
    formData.append('file', valueOrFile);
    const response = await fetch(`${API_URL}/submissions/${subId}/respond-info`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to upload requested info');
    return response.json();
  } else {
    const response = await fetch(`${API_URL}/submissions/${subId}/respond-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: valueOrFile })
    });
    if (!response.ok) throw new Error('Failed to submit requested info');
    return response.json();
  }
};
