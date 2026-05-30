import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials not configured! Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables (.env).");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- HELPER: UPLOAD FILE TO SUPABASE STORAGE ---
const uploadFileToSupabase = async (folder, file) => {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const cleanFileName = `${folder}_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
  const filePath = `${folder}/${cleanFileName}`;

  const { data, error } = await supabase.storage
    .from('whatsbro-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('whatsbro-assets')
    .getPublicUrl(data.path);

  return publicUrl;
};

// --- HELPER: DELETE FILE FROM STORAGE URL ---
const deleteFileFromStorageUrl = async (url) => {
  if (!url) return;
  try {
    // Extract relative path from public Supabase URL
    // Format: https://xxx.supabase.co/storage/v1/object/public/whatsbro-assets/folder/file.ext
    const marker = '/storage/v1/object/public/whatsbro-assets/';
    const index = url.indexOf(marker);
    if (index !== -1) {
      const relativePath = url.substring(index + marker.length);
      await supabase.storage
        .from('whatsbro-assets')
        .remove([relativePath]);
    }
  } catch (err) {
    console.error("Failed to delete physical file from storage:", err);
  }
};


// --- POSTS SERVICE ---
export const getPosts = async () => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('id', { ascending: true });
    
  if (error) throw error;
  return data || [];
};

export const createPost = async (postData) => {
  const { data, error } = await supabase
    .from('posts')
    .insert([postData])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updatePost = async (id, postData) => {
  const { data, error } = await supabase
    .from('posts')
    .update(postData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deletePost = async (id) => {
  // Try to delete image if exists
  const { data: post } = await supabase.from('posts').select('img_url').eq('id', id).single();
  if (post && post.img_url) {
    await deleteFileFromStorageUrl(post.img_url);
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return { success: true, message: "Post deleted" };
};

export const uploadPostImage = async (file) => {
  const publicUrl = await uploadFileToSupabase('posts', file);
  return { img_url: publicUrl };
};


// --- FORMS SERVICE ---
export const getForms = async () => {
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  
  // Format fields to ensure they return parsed objects/arrays
  return (data || []).map(form => ({
    ...form,
    fields: typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields,
    required_fields: typeof form.required_fields === 'string' ? JSON.parse(form.required_fields) : form.required_fields,
    required_docs: typeof form.required_docs === 'string' ? JSON.parse(form.required_docs) : form.required_docs,
    custom_docs: typeof form.custom_docs === 'string' ? JSON.parse(form.custom_docs) : (form.custom_docs || [])
  }));
};

export const getFormById = async (id) => {
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw new Error('Form not found');
  
  return {
    ...data,
    fields: typeof data.fields === 'string' ? JSON.parse(data.fields) : data.fields,
    required_fields: typeof data.required_fields === 'string' ? JSON.parse(data.required_fields) : data.required_fields,
    required_docs: typeof data.required_docs === 'string' ? JSON.parse(data.required_docs) : data.required_docs,
    custom_docs: typeof data.custom_docs === 'string' ? JSON.parse(data.custom_docs) : (data.custom_docs || [])
  };
};

export const createForm = async (formData) => {
  const payload = {
    ...formData,
    fields: typeof formData.fields !== 'string' ? JSON.stringify(formData.fields) : formData.fields,
    required_fields: typeof formData.required_fields !== 'string' ? JSON.stringify(formData.required_fields) : formData.required_fields,
    required_docs: typeof formData.required_docs !== 'string' ? JSON.stringify(formData.required_docs) : formData.required_docs,
    custom_docs: typeof formData.custom_docs !== 'string' ? JSON.stringify(formData.custom_docs || []) : formData.custom_docs
  };

  const { data, error } = await supabase
    .from('forms')
    .insert([payload])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateForm = async (id, formData) => {
  const payload = { ...formData };
  if (formData.fields !== undefined) payload.fields = typeof formData.fields !== 'string' ? JSON.stringify(formData.fields) : formData.fields;
  if (formData.required_fields !== undefined) payload.required_fields = typeof formData.required_fields !== 'string' ? JSON.stringify(formData.required_fields) : formData.required_fields;
  if (formData.required_docs !== undefined) payload.required_docs = typeof formData.required_docs !== 'string' ? JSON.stringify(formData.required_docs) : formData.required_docs;
  if (formData.custom_docs !== undefined) payload.custom_docs = typeof formData.custom_docs !== 'string' ? JSON.stringify(formData.custom_docs) : formData.custom_docs;

  const { data, error } = await supabase
    .from('forms')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteForm = async (id) => {
  const { error } = await supabase
    .from('forms')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return { success: true, message: "Form and associated submissions deleted" };
};


// --- SUBMISSIONS SERVICE ---
export const submitFormResponse = async (formId, phone, dob, aadhar, responses) => {
  const subId = `sub-${Math.random().toString(36).substring(2, 10)}`;

  // Find user by phone to link user_id if they have a registered profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone.trim())
    .maybeSingle();

  const newSubmission = {
    id: subId,
    form_id: formId,
    user_id: userProfile?.id || null,
    phone: phone.trim(),
    dob: dob.trim(),
    aadhar: aadhar ? aadhar.trim() : null,
    responses: typeof responses !== 'string' ? JSON.stringify(responses) : responses,
    uploaded_docs: '{}',
    payment_status: "unpaid",
    payment_screenshot: null,
    progress_percent: 10,
    progress_desc: "Application submitted successfully. Awaiting payment verification.",
    uploaded_pdf_url: null,
    submitted_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('submissions')
    .insert([newSubmission])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getUserStatus = async (phone, dob, aadhar) => {
  if (!dob) throw new Error('Date of Birth is required');

  let query = supabase
    .from('submissions')
    .select('*')
    .eq('dob', dob.trim());

  if (phone) {
    query = query.eq('phone', phone.trim());
  } else if (aadhar) {
    query = query.eq('aadhar', aadhar.trim());
  } else {
    throw new Error('Must provide either Phone number or Aadhaar number to verify status.');
  }

  const { data, error } = await query.order('submitted_at', { ascending: false });
  if (error) throw error;
  return data || [];
};


// --- USER PROFILE SERVICES ---
export const registerUser = async (userData) => {
  const phoneClean = (userData.phone || '').trim();
  const dobClean = (userData.dob || '').trim();
  const aadharClean = userData.aadhar ? userData.aadhar.trim() : null;

  // Check unique constraints
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phoneClean)
    .eq('dob', dobClean)
    .maybeSingle();

  if (existingUser) {
    throw new Error("A user with this Phone number and DOB is already registered.");
  }

  if (aadharClean) {
    const { data: existingAadhar } = await supabase
      .from('users')
      .select('id')
      .eq('aadhar', aadharClean)
      .eq('dob', dobClean)
      .maybeSingle();

    if (existingAadhar) {
      throw new Error("A user with this Aadhaar number and DOB is already registered.");
    }
  }

  const newId = `usr-${Math.random().toString(36).substring(2, 10)}`;
  const newUser = {
    id: newId,
    name: userData.name,
    name_tamil: userData.name_tamil || null,
    dob: dobClean,
    phone: phoneClean,
    aadhar: aadharClean,
    gender: userData.gender || null,
    marital_status: userData.marital_status || null,
    father_name: userData.father_name || null,
    father_name_tamil: userData.father_name_tamil || null,
    mother_name: userData.mother_name || null,
    mother_name_tamil: userData.mother_name_tamil || null,
    community: userData.community || null,
    address: userData.address || null,
    religion: userData.religion || null,
    state: userData.state || null,
    district: userData.district || null,
    taluk: userData.taluk || null,
    revenue_village: userData.revenue_village || null,
    street_name: userData.street_name || null,
    door_no: userData.door_no || null,
    pincode: userData.pincode || null,
    saved_docs: '{}',
    photo_url: null,
    aadhar_url_1: null,
    aadhar_url_2: null,
    smart_card_url_1: null,
    smart_card_url_2: null,
    voter_id_url_1: null,
    voter_id_url_2: null,
    signature_url_1: null,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('users')
    .insert([newUser])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const loginUser = async (loginData) => {
  const phoneClean = (loginData.phone || '').trim();
  const dobClean = (loginData.dob || '').trim();
  const aadharClean = loginData.aadhar ? loginData.aadhar.trim() : '';

  let query = supabase.from('users').select('*').eq('dob', dobClean);

  if (phoneClean) {
    query = query.eq('phone', phoneClean);
  } else if (aadharClean) {
    query = query.eq('aadhar', aadharClean);
  } else {
    throw new Error("Must provide Phone or Aadhaar to login.");
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No user account found matching these credentials.");
  return data;
};

export const updateUserProfile = async (userId, profileData) => {
  const { data, error } = await supabase
    .from('users')
    .update(profileData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const uploadUserDocument = async (userId, docType, file1, file2 = null) => {
  // Validate type
  const validDocTypes = ["photo", "aadhar", "smart_card", "voter_id", "signature"];
  if (!validDocTypes.includes(docType)) throw new Error("Invalid document type");

  // Fetch current user
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userErr || !user) throw new Error("User profile not found");

  // Clean old files
  let oldUrls = [];
  if (docType === "photo" && user.photo_url) oldUrls.push(user.photo_url);
  if (docType === "aadhar") {
    if (user.aadhar_url_1) oldUrls.push(user.aadhar_url_1);
    if (user.aadhar_url_2) oldUrls.push(user.aadhar_url_2);
  }
  if (docType === "smart_card") {
    if (user.smart_card_url_1) oldUrls.push(user.smart_card_url_1);
    if (user.smart_card_url_2) oldUrls.push(user.smart_card_url_2);
  }
  if (docType === "voter_id") {
    if (user.voter_id_url_1) oldUrls.push(user.voter_id_url_1);
    if (user.voter_id_url_2) oldUrls.push(user.voter_id_url_2);
  }
  if (docType === "signature" && user.signature_url_1) oldUrls.push(user.signature_url_1);
  
  for (const url of oldUrls) {
    await deleteFileFromStorageUrl(url);
  }

  // Upload new files
  const url1 = await uploadFileToSupabase('documents', file1);
  const url2 = file2 ? await uploadFileToSupabase('documents', file2) : null;

  // Build update mapping
  const updates = {};
  if (docType === "photo") {
    updates.photo_url = url1;
  } else if (docType === "aadhar") {
    updates.aadhar_url_1 = url1;
    updates.aadhar_url_2 = url2;
  } else if (docType === "smart_card") {
    updates.smart_card_url_1 = url1;
    updates.smart_card_url_2 = url2;
  } else if (docType === "voter_id") {
    updates.voter_id_url_1 = url1;
    updates.voter_id_url_2 = url2;
  } else if (docType === "signature") {
    updates.signature_url_1 = url1;
  }

  // Save updates
  const { data: updatedUser, error: updateErr } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (updateErr) throw updateErr;
  return updatedUser;
};

export const deleteUserDocument = async (userId, docType) => {
  const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!user) throw new Error("User not found");

  const updates = {};
  let urlsToDelete = [];

  if (docType === 'photo') {
    if (user.photo_url) urlsToDelete.push(user.photo_url);
    updates.photo_url = null;
  } else if (docType === 'aadhar') {
    if (user.aadhar_url_1) urlsToDelete.push(user.aadhar_url_1);
    if (user.aadhar_url_2) urlsToDelete.push(user.aadhar_url_2);
    updates.aadhar_url_1 = null;
    updates.aadhar_url_2 = null;
  } else if (docType === 'smart_card') {
    if (user.smart_card_url_1) urlsToDelete.push(user.smart_card_url_1);
    if (user.smart_card_url_2) urlsToDelete.push(user.smart_card_url_2);
    updates.smart_card_url_1 = null;
    updates.smart_card_url_2 = null;
  } else if (docType === 'voter_id') {
    if (user.voter_id_url_1) urlsToDelete.push(user.voter_id_url_1);
    if (user.voter_id_url_2) urlsToDelete.push(user.voter_id_url_2);
    updates.voter_id_url_1 = null;
    updates.voter_id_url_2 = null;
  } else if (docType === 'signature') {
    if (user.signature_url_1) urlsToDelete.push(user.signature_url_1);
    updates.signature_url_1 = null;
  }

  for (const url of urlsToDelete) {
    await deleteFileFromStorageUrl(url);
  }

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return updatedUser;
};

export const uploadSubmissionDocument = async (subId, docKey, file1, file2 = null) => {
  const { data: sub } = await supabase.from('submissions').select('*').eq('id', subId).single();
  if (!sub) throw new Error("Submission not found");

  const url1 = await uploadFileToSupabase('documents', file1);
  const url2 = file2 ? await uploadFileToSupabase('documents', file2) : null;

  let currentDocs = {};
  if (sub.uploaded_docs) {
    currentDocs = typeof sub.uploaded_docs === 'string' ? JSON.parse(sub.uploaded_docs) : sub.uploaded_docs;
  }

  currentDocs[docKey] = url2 ? [url1, url2] : [url1];

  const { data: updatedSub, error } = await supabase
    .from('submissions')
    .update({ uploaded_docs: JSON.stringify(currentDocs) })
    .eq('id', subId)
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    doc_key: docKey,
    urls: currentDocs[docKey]
  };
};

export const uploadPaymentScreenshot = async (subId, file) => {
  const { data: sub } = await supabase.from('submissions').select('payment_screenshot').eq('id', subId).single();
  if (sub && sub.payment_screenshot) {
    await deleteFileFromStorageUrl(sub.payment_screenshot);
  }

  const publicUrl = await uploadFileToSupabase('screenshots', file);

  const { data: updatedSub, error } = await supabase
    .from('submissions')
    .update({
      payment_screenshot: publicUrl,
      progress_desc: "Payment receipt uploaded. Admin is verifying your payment details."
    })
    .eq('id', subId)
    .select()
    .single();

  if (error) throw error;
  return updatedSub;
};

export const uploadOutputPdf = async (subId, file) => {
  const { data: sub } = await supabase.from('submissions').select('uploaded_pdf_url').eq('id', subId).single();
  if (sub && sub.uploaded_pdf_url) {
    await deleteFileFromStorageUrl(sub.uploaded_pdf_url);
  }

  const publicUrl = await uploadFileToSupabase('pdfs', file);

  const { data: updatedSub, error } = await supabase
    .from('submissions')
    .update({
      uploaded_pdf_url: publicUrl,
      progress_percent: 100
    })
    .eq('id', subId)
    .select()
    .single();

  if (error) throw error;
  return updatedSub;
};

export const adminUploadDoc = async (subId, docType, file) => {
  // Validate type
  const validTypes = ['receipt', 'certificate', 'other'];
  if (!validTypes.includes(docType)) throw new Error("Invalid document type");

  const columnMap = {
    receipt: 'receipt_url',
    certificate: 'certificate_url',
    other: 'other_doc_url'
  };

  const dbColName = columnMap[docType];

  const { data: sub } = await supabase.from('submissions').select(dbColName).eq('id', subId).single();
  if (sub && sub[dbColName]) {
    await deleteFileFromStorageUrl(sub[dbColName]);
  }

  const publicUrl = await uploadFileToSupabase('pdfs', file);

  const { data: updatedSub, error } = await supabase
    .from('submissions')
    .update({ [dbColName]: publicUrl })
    .eq('id', subId)
    .select()
    .single();

  if (error) throw error;
  return updatedSub;
};

export const adminDeleteDoc = async (subId, docType) => {
  const columnMap = {
    receipt: 'receipt_url',
    certificate: 'certificate_url',
    other: 'other_doc_url'
  };

  const dbColName = columnMap[docType];

  const { data: sub } = await supabase.from('submissions').select(dbColName).eq('id', subId).single();
  if (!sub) throw new Error("Submission not found");

  if (sub[dbColName]) {
    await deleteFileFromStorageUrl(sub[dbColName]);
  }

  const updates = { [dbColName]: null };
  if (docType === 'other') {
    updates.other_doc_name = null;
  }

  const { data: updatedSub, error } = await supabase
    .from('submissions')
    .update(updates)
    .eq('id', subId)
    .select()
    .single();

  if (error) throw error;
  return updatedSub;
};


// --- ADMIN USERS LIST SERVICES ---
export const getUsersList = async () => {
  // Fetch all submissions sorted descending by submitted_at
  const { data: subs, error: subErr } = await supabase
    .from('submissions')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (subErr) throw subErr;

  // Fetch all users
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('*');

  if (userErr) throw userErr;

  const seenAadhar = new Set();
  const uniqueUsers = [];

  for (const sub of (subs || [])) {
    if (sub.aadhar && !seenAadhar.has(sub.aadhar)) {
      seenAadhar.add(sub.aadhar);
      const userProfile = (users || []).find(u => u.aadhar === sub.aadhar) || {};
      uniqueUsers.push({
        aadhar: sub.aadhar,
        phone: sub.phone,
        dob: sub.dob,
        last_active: sub.submitted_at,
        name: userProfile.name || '',
        photo_url: userProfile.photo_url || null,
        aadhar_url_1: userProfile.aadhar_url_1 || null,
        aadhar_url_2: userProfile.aadhar_url_2 || null,
        smart_card_url_1: userProfile.smart_card_url_1 || null,
        smart_card_url_2: userProfile.smart_card_url_2 || null,
        voter_id_url_1: userProfile.voter_id_url_1 || null,
        voter_id_url_2: userProfile.voter_id_url_2 || null,
        signature_url_1: userProfile.signature_url_1 || null
      });
    }
  }

  return uniqueUsers;
};

export const getSubmissionsByUser = async (aadhar) => {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('aadhar', aadhar.trim())
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const adminUpdateSubmission = async (subId, updateData) => {
  const { data, error } = await supabase
    .from('submissions')
    .update(updateData)
    .eq('id', subId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteSubmission = async (subId) => {
  const { data: sub } = await supabase
    .from('submissions')
    .select('payment_screenshot, uploaded_pdf_url, receipt_url, certificate_url, other_doc_url')
    .eq('id', subId)
    .single();

  if (sub) {
    if (sub.payment_screenshot) await deleteFileFromStorageUrl(sub.payment_screenshot);
    if (sub.uploaded_pdf_url) await deleteFileFromStorageUrl(sub.uploaded_pdf_url);
    if (sub.receipt_url) await deleteFileFromStorageUrl(sub.receipt_url);
    if (sub.certificate_url) await deleteFileFromStorageUrl(sub.certificate_url);
    if (sub.other_doc_url) await deleteFileFromStorageUrl(sub.other_doc_url);
  }

  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', subId);

  if (error) throw error;
  return { success: true, message: "Submission deleted successfully" };
};

export const deleteUserAndSubmissions = async (aadhar) => {
  // Get all submissions for user to delete files
  const { data: subs } = await supabase
    .from('submissions')
    .select('payment_screenshot, uploaded_pdf_url, receipt_url, certificate_url, other_doc_url')
    .eq('aadhar', aadhar);

  if (subs) {
    for (const sub of subs) {
      if (sub.payment_screenshot) await deleteFileFromStorageUrl(sub.payment_screenshot);
      if (sub.uploaded_pdf_url) await deleteFileFromStorageUrl(sub.uploaded_pdf_url);
      if (sub.receipt_url) await deleteFileFromStorageUrl(sub.receipt_url);
      if (sub.certificate_url) await deleteFileFromStorageUrl(sub.certificate_url);
      if (sub.other_doc_url) await deleteFileFromStorageUrl(sub.other_doc_url);
    }
  }

  // Delete all submissions row
  await supabase.from('submissions').delete().eq('aadhar', aadhar);

  // Fetch and delete user documents
  const { data: user } = await supabase.from('users').select('*').eq('aadhar', aadhar).maybeSingle();
  if (user) {
    const docUrls = [
      user.photo_url,
      user.aadhar_url_1, user.aadhar_url_2,
      user.smart_card_url_1, user.smart_card_url_2,
      user.voter_id_url_1, user.voter_id_url_2,
      user.signature_url_1
    ].filter(Boolean);

    for (const url of docUrls) {
      await deleteFileFromStorageUrl(url);
    }
    
    // Delete user row
    await supabase.from('users').delete().eq('aadhar', aadhar);
  }

  return { success: true, message: `User with Aadhaar ${aadhar} and all applications deleted.` };
};

export const submitInfoRequestResponse = async (subId, valueOrFile, isFile = false) => {
  if (isFile) {
    const publicUrl = await uploadFileToSupabase('documents', valueOrFile);
    
    const { data, error } = await supabase
      .from('submissions')
      .update({ info_request_response: publicUrl })
      .eq('id', subId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('submissions')
      .update({ info_request_response: valueOrFile })
      .eq('id', subId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
