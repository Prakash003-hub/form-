import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  getPosts, 
  getForms, 
  submitFormResponse, 
  getUserStatus, 
  uploadPaymentScreenshot,
  registerUser,
  updateUserProfile,
  uploadUserDocument,
  uploadSubmissionDocument,
  submitInfoRequestResponse,
  deleteUserDocument
} from '../services/db';
import { 
  CheckCircle, 
  Download, 
  UploadCloud, 
  Filter, 
  Calendar, 
  Phone, 
  User, 
  CreditCard,
  ChevronRight,
  ArrowLeft,
  Printer,
  FileText,
  FileCheck,
  Upload,
  AlertCircle,
  Eye,
  Check,
  X,
  ShieldAlert,
  Trash2
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

const STANDARD_FIELDS = {
  name: { label: 'Applicant Name', type: 'text', required: true },
  name_tamil: { label: 'பெயர் ( தமிழில் )', type: 'text', required: false },
  dob: { label: 'Date of Birth (DOB)', type: 'date', required: true },
  phone: { label: 'Mobile Number', type: 'tel', required: true },
  aadhar: { label: 'Aadhaar Number', type: 'text', required: false },
  gender: { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: false },
  marital_status: { label: 'Marital Status', type: 'select', options: ['Unmarried', 'Married', 'Divorced', 'Widowed'], required: false },
  father_name: { label: 'Father', type: 'text', required: false },
  father_name_tamil: { label: 'தந்தை பெயர் ( தமிழில் )', type: 'text', required: false },
  mother_name: { label: "Mother Name", type: 'text', required: false },
  mother_name_tamil: { label: 'தாயின் பெயர் ( தமிழில் )', type: 'text', required: false },
  religion: { label: 'Religion', type: 'select', options: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'], required: false },
  community: { label: 'Community', type: 'select', options: ['OC', 'BC', 'MBC', 'SC', 'ST', 'DNC', 'BCM'], required: false },
  state: { label: 'State', type: 'select', options: ['Tamil Nadu', 'Puducherry', 'Kerala', 'Karnataka', 'Andhra Pradesh'], required: false },
  district: { label: 'District', type: 'select', options: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Thanjavur', 'Kancheepuram', 'Tiruvallur', 'Tiruvannamalai', 'Viluppuram', 'Cuddalore', 'Pudukkottai', 'Karur', 'Namakkal', 'Dharmapuri', 'Krishnagiri', 'The Nilgiris', 'Theni', 'Dindigul', 'Virudhunagar', 'Sivaganga', 'Ramanathapuram', 'Tiruppur', 'Tenkasi', 'Chengalpattu', 'Ranipet', 'Tirupathur', 'Kallakurichi', 'Mayiladuthurai'], required: false },
  taluk: { label: 'Taluk', type: 'text', required: false },
  revenue_village: { label: 'Revenue Village ( பாஞ்சாயத்து )', type: 'text', required: false },
  street_name: { label: 'Street Name', type: 'text', required: false },
  door_no: { label: 'Door no', type: 'text', required: false },
  pincode: { label: 'Pin Code', type: 'number', required: false },
  address: { label: 'Address', type: 'textarea', required: false },
  
  photo: { label: 'Photo Upload (image < 7MB)' },
  aadhar_doc: { label: 'Aadhaar Upload (img/pdf < 5MB)' },
  smart_card: { label: 'Smart Card Upload (img/pdf < 5MB)' },
  voter_id: { label: 'Voter ID Upload (img/pdf < 5MB)' },
  signature: { label: 'Signature Upload (img/pdf < 5MB)' }
};

export default function UserPortal({ currentUser, onUpdateProfile, onLoginTrigger }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab states: 'home' | 'apply' | 'status'
  const activeTab = searchParams.get('tab') || 'home';
  const initialCategory = searchParams.get('category') || '';
  
  const [posts, setPosts] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  
  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Wizard States
  const [selectedForm, setSelectedForm] = useState(null);
  const [wizardStep, setWizardStep] = useState(1); 
  // 1: Instructions, 2: Fill/Verify, 3: Preview, 4: Upload Docs, 5: Receipt
  
  const [formData, setFormData] = useState({}); // Dynamic and standard values
  const [agreeCheckbox, setAgreeCheckbox] = useState(false);
  
  // Document upload state
  // Stores file selections: { [docKey]: { type: 'pdf' | 'images', file1, file2 } }
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadProgress, setUploadProgress] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);
  
  // Status Lookup States
  const [lookupType, setLookupType] = useState('phone'); // 'phone' or 'aadhar'
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupAadhar, setLookupAadhar] = useState('');
  const [lookupDob, setLookupDob] = useState('');
  const [userApplications, setUserApplications] = useState([]);
  const [hasSearchedStatus, setHasSearchedStatus] = useState(false);
  const [uploadingScreenshotId, setUploadingScreenshotId] = useState(null);

  const [infoRequestTexts, setInfoRequestTexts] = useState({});
  const [infoRequestFiles, setInfoRequestFiles] = useState({});
  const [deletedSavedDocs, setDeletedSavedDocs] = useState({});

  const handleInfoRequestSubmit = async (appId, type) => {
    setLoading(true);
    try {
      if (type === 'file') {
        const file = infoRequestFiles[appId];
        if (!file) {
          alert('Please select a file to upload.');
          return;
        }
        await submitInfoRequestResponse(appId, file, true);
      } else {
        const text = infoRequestTexts[appId] || '';
        if (!text.trim()) {
          alert('Please enter a response.');
          return;
        }
        await submitInfoRequestResponse(appId, text, false);
      }
      alert('Information submitted successfully! Thank you.');
      
      // Refresh list
      const phoneVal = currentUser?.phone || lookupPhone;
      const dobVal = currentUser?.dob || lookupDob;
      const aadharVal = currentUser?.aadhar || lookupAadhar;
      const data = await getUserStatus(phoneVal, dobVal, aadharVal);
      setUserApplications(data);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSavedDoc = async (docKey) => {
    if (!currentUser) return;
    const docLabel = STANDARD_FIELDS[docKey]?.label || docKey;
    if (!window.confirm(`Are you sure you want to delete and replace your stored ${docLabel}? This will physically delete the file from the server.`)) {
      return;
    }
    setLoading(true);
    try {
      const updatedUser = await deleteUserDocument(currentUser.id, docKey);
      onUpdateProfile(updatedUser);
      setDeletedSavedDocs(prev => ({ ...prev, [docKey]: true }));
      alert(`Stored ${docLabel} has been successfully deleted from the server. Please select and upload your new file.`);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete stored document.');
    } finally {
      setLoading(false);
    }
  };

  async function fetchPostsAndForms() {
    setLoading(true);
    try {
      const postsData = await getPosts();
      const formsData = await getForms();
      setPosts(postsData);
      setForms(formsData);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to backend server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPostsAndForms();
  }, []);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Load User profile data into form when entering step 2
  useEffect(() => {
    if (selectedForm && wizardStep === 2) {
      const initialFields = {};
      let fieldsConfig = safeJsonParse(selectedForm.required_fields, []);
      
      const isCase2 = currentUser && !!(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name);
      
      if (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' && !isCase2) {
        const canFields = [
          'aadhar', 'phone', 'name', 'name_tamil', 'gender', 'marital_status', 'dob',
          'father_name', 'mother_name', 'father_name_tamil', 'mother_name_tamil',
          'religion', 'community', 'state', 'district', 'taluk', 'revenue_village',
          'street_name', 'door_no', 'pincode', 'address'
        ];
        fieldsConfig = Array.from(new Set([...canFields, ...fieldsConfig]));
      }
      
      // If user is logged in, prefill standard fields from profile
      if (currentUser) {
        fieldsConfig.forEach(fieldId => {
          if (fieldId === 'marital_status') {
            initialFields['marital_status'] = currentUser.marital_status || '';
          } else {
            initialFields[fieldId] = currentUser[fieldId] || '';
          }
        });
      }
      
      setFormData(prev => ({ ...initialFields, ...prev }));
    }
  }, [selectedForm, wizardStep, currentUser]);

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
    // Reset wizard states
    if (tabName !== 'apply') {
      setSelectedForm(null);
      setWizardStep(1);
      setFormData({});
      setUploadedFiles({});
      setSubmissionResult(null);
      setAgreeCheckbox(false);
      setDeletedSavedDocs({});
    }
  };

  const selectFormToFill = (form) => {
    setSelectedForm(form);
    setWizardStep(1);
    setFormData({});
    setUploadedFiles({});
    setAgreeCheckbox(false);
    setDeletedSavedDocs({});
  };

  const handleFieldChange = (fieldId, val) => {
    setFormData(prev => ({ ...prev, [fieldId]: val }));
  };

  // --- WIZARD STEPS PROGRESSION ---

  // Proceed from Step 1 (Instructions) to Step 2 (Form details)
  const handleProceedToForm = () => {
    setWizardStep(2);
  };

  // Proceed from Step 2 (Form details) to Step 3 (Preview)
  const handleValidateForm = async (e) => {
    e.preventDefault();
    
    // Check validation of standard required fields
    let reqFields = safeJsonParse(selectedForm.required_fields, []);
    const isCase2 = currentUser && !!(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name);
    
    if (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' && !isCase2) {
      const canFields = [
        'aadhar', 'phone', 'name', 'name_tamil', 'gender', 'marital_status', 'dob',
        'father_name', 'mother_name', 'father_name_tamil', 'mother_name_tamil',
        'religion', 'community', 'state', 'district', 'taluk', 'revenue_village',
        'street_name', 'door_no', 'pincode', 'address'
      ];
      reqFields = Array.from(new Set([...canFields, ...reqFields]));
    }
    const missing = [];
    
    reqFields.forEach(fieldId => {
      const isFieldRequired = STANDARD_FIELDS[fieldId]?.required || (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai');
      if (isFieldRequired && !formData[fieldId]) {
        missing.push(STANDARD_FIELDS[fieldId]?.label || fieldId);
      }
    });

    // Dynamic fields verification
    const customFields = safeJsonParse(selectedForm.fields, []);
    customFields.forEach(f => {
      if (f.required && !formData[f.id]) {
        missing.push(f.label);
      }
    });

    if (missing.length > 0) {
      alert(`Please fill in all required fields: ${missing.join(', ')}`);
      return;
    }

    // Phone / Aadhaar validation checks
    if (formData.phone && !formData.phone.match(/^\d{10}$/)) {
      alert('Please enter a valid 10-digit Phone Number');
      return;
    }
    if (formData.aadhar && !formData.aadhar.match(/^\d{12}$/)) {
      alert('Please enter a valid 12-digit Aadhaar Number');
      return;
    }

    setLoading(true);
    try {
      if (!currentUser) {
        // User not registered: automatically register them on the fly
        const regPayload = {
          name: formData.name || 'User Profile',
          name_tamil: formData.name_tamil || undefined,
          dob: formData.dob || '',
          phone: formData.phone || '',
          aadhar: formData.aadhar || undefined,
          gender: formData.gender || undefined,
          marital_status: formData.marital_status || undefined,
          father_name: formData.father_name || undefined,
          father_name_tamil: formData.father_name_tamil || undefined,
          mother_name: formData.mother_name || undefined,
          mother_name_tamil: formData.mother_name_tamil || undefined,
          community: formData.community || undefined,
          address: formData.address || undefined,
          religion: formData.religion || undefined,
          state: formData.state || undefined,
          district: formData.district || undefined,
          taluk: formData.taluk || undefined,
          revenue_village: formData.revenue_village || undefined,
          street_name: formData.street_name || undefined,
          door_no: formData.door_no || undefined,
          pincode: formData.pincode || undefined
        };

        const registeredUser = await registerUser(regPayload);
        onUpdateProfile(registeredUser);
        alert('Welcome! We have registered your details in WhatsBro so you can pre-fill forms easily in the future.');
      } else {
        // User is logged in: update profile with any inline corrections
        const updatePayload = {
          name: formData.name,
          name_tamil: formData.name_tamil || undefined,
          dob: formData.dob || '',
          phone: formData.phone || '',
          aadhar: formData.aadhar || undefined,
          gender: formData.gender || undefined,
          marital_status: formData.marital_status || undefined,
          father_name: formData.father_name || undefined,
          father_name_tamil: formData.father_name_tamil || undefined,
          mother_name: formData.mother_name || undefined,
          mother_name_tamil: formData.mother_name_tamil || undefined,
          community: formData.community || undefined,
          address: formData.address || undefined,
          religion: formData.religion || undefined,
          state: formData.state || undefined,
          district: formData.district || undefined,
          taluk: formData.taluk || undefined,
          revenue_village: formData.revenue_village || undefined,
          street_name: formData.street_name || undefined,
          door_no: formData.door_no || undefined,
          pincode: formData.pincode || undefined
        };
        const updated = await updateUserProfile(currentUser.id, updatePayload);
        onUpdateProfile(updated);
      }
      setWizardStep(3); // Proceed to Step 3 (Preview)
    } catch (err) {
      console.error(err);
      alert(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Proceed from Step 3 (Preview) to Step 4 (Upload Docs)
  const handleProceedToUploads = () => {
    if (!agreeCheckbox) {
      alert('Please check the terms and conditions checkbox to proceed.');
      return;
    }
    setWizardStep(4);
  };

  // Handle local file selections inside Step 4
  const handleFileChange = (docKey, uploadType, fileInputIdx, file) => {
    if (!file) return;

    // Check size limit: Photo < 7MB, other < 5MB
    const limit = docKey === 'photo' ? 7 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > limit) {
      alert(`File size exceeds limit. ${docKey === 'photo' ? 'Photo' : 'Documents'} must be less than ${limit / (1024 * 1024)}MB.`);
      return;
    }

    setUploadedFiles(prev => {
      const current = prev[docKey] || { type: uploadType };
      if (uploadType === 'pdf') {
        return {
          ...prev,
          [docKey]: { type: 'pdf', file1: file }
        };
      } else {
        return {
          ...prev,
          [docKey]: {
            ...current,
            type: 'images',
            [`file${fileInputIdx}`]: file
          }
        };
      }
    });
  };

  // Proceed from Step 4 (Upload Docs) to Step 5 (Receipt) - Perform uploads and save submission
  const handleFinalWizardSubmit = async () => {
    const requiredDocsList = safeJsonParse(selectedForm.required_docs, []);
    const customDocsList = safeJsonParse(selectedForm.custom_docs, []);
    const missing = [];

    // Verify all required documents are selected OR exist in profile
    requiredDocsList.forEach(docKey => {
      const isAlreadyUploaded = currentUser && !deletedSavedDocs[docKey] && (
        (docKey === 'photo' && currentUser.photo_url) ||
        (docKey === 'signature' && currentUser.signature_url_1) ||
        currentUser[`${docKey}_url_1`] ||
        currentUser[`${docKey}_url`]
      );
      const isSelectedLocal = uploadedFiles[docKey] && (uploadedFiles[docKey].file1 || uploadedFiles[docKey].file2);
      
      if (!isAlreadyUploaded && !isSelectedLocal) {
        missing.push(STANDARD_FIELDS[docKey]?.label || docKey);
      }
    });

    customDocsList.forEach(docLabel => {
      const isSelectedLocal = uploadedFiles[docLabel] && uploadedFiles[docLabel].file1;
      if (!isSelectedLocal) {
        missing.push(docLabel);
      }
    });

    if (missing.length > 0) {
      alert(`Please select files to upload for: ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    setUploadProgress('Storing application data...');

    try {
      // 1. Package response answers (split standard fields and custom fields)
      const reqFieldsKeys = safeJsonParse(selectedForm.required_fields, []);
      const customFields = safeJsonParse(selectedForm.fields, []);
      
      const responsesPack = {};
      
      // Save responses for both standard selected fields and custom questions
      reqFieldsKeys.forEach(fieldId => {
        responsesPack[STANDARD_FIELDS[fieldId]?.label || fieldId] = formData[fieldId] || '';
      });
      customFields.forEach(f => {
        responsesPack[f.label] = formData[f.id] || '';
      });

      // 2. Prepare pre-existing documents payload to avoid duplicate uploads
      const docReferencesPack = {};
      requiredDocsList.forEach(docKey => {
        if (deletedSavedDocs[docKey]) return; // Skip if deleted/replaced!
        
        const hasSavedUrl1 = currentUser && currentUser[`${docKey}_url_1` || ''];
        const hasSavedUrl2 = currentUser && currentUser[`${docKey}_url_2` || ''];
        const isPhotoSavedUrl = docKey === 'photo' && currentUser && currentUser.photo_url;
        const isSignatureSavedUrl = docKey === 'signature' && currentUser && currentUser.signature_url_1;
        
        if (isPhotoSavedUrl && !uploadedFiles['photo']) {
          docReferencesPack['photo'] = [currentUser.photo_url];
        } else if (isSignatureSavedUrl && !uploadedFiles['signature']) {
          docReferencesPack['signature'] = [currentUser.signature_url_1];
        } else if (hasSavedUrl1 && !uploadedFiles[docKey]) {
          docReferencesPack[docKey] = [hasSavedUrl1];
          if (hasSavedUrl2) docReferencesPack[docKey].push(hasSavedUrl2);
        }
      });

      // 3. Create Submission record in Backend
      const submission = await submitFormResponse(
        selectedForm.id,
        formData.phone || currentUser?.phone || '',
        formData.dob || currentUser?.dob || '',
        formData.aadhar || currentUser?.aadhar || '',
        responsesPack
      );

      // Save initial document mappings
      if (Object.keys(docReferencesPack).length > 0) {
        submission.uploaded_docs = JSON.stringify(docReferencesPack);
      }

      setSubmissionResult(submission);

      // 4. Perform upload calls for all newly selected files
      const uploadsMap = Object.entries(uploadedFiles);
      for (let i = 0; i < uploadsMap.length; i++) {
        const [docKey, fileObj] = uploadsMap[i];
        setUploadProgress(`Uploading ${docKey.replace(/_/g, ' ')} file (${i + 1}/${uploadsMap.length})...`);

        const isStandardDoc = ['photo', 'aadhar', 'smart_card', 'voter_id', 'signature'].includes(docKey);

        if (fileObj.type === 'pdf') {
          // Single PDF Upload
          await uploadSubmissionDocument(submission.id, docKey, fileObj.file1);
          // Also sync to global user profile for future pre-filling
          if (currentUser && isStandardDoc) {
            await uploadUserDocument(currentUser.id, docKey, fileObj.file1);
          }
        } else {
          // Front and Back images upload
          await uploadSubmissionDocument(submission.id, docKey, fileObj.file1, fileObj.file2);
          if (currentUser && isStandardDoc) {
            await uploadUserDocument(currentUser.id, docKey, fileObj.file1, fileObj.file2);
          }
        }
      }

      // Fetch latest profile state to sync document URLs
      if (currentUser) {
        const query = await getUserStatus(currentUser.phone, currentUser.dob);
        // Simply trigger a logout/login sequence or re-load the profile locally
        const latestProfile = await fetch(`http://${window.location.hostname}:8000/api/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dob: currentUser.dob, phone: currentUser.phone })
        }).then(r => r.json()).catch(() => null);
        
        if (latestProfile && latestProfile.id) {
          onUpdateProfile(latestProfile);
        }
      }

      setUploadProgress('');
      setWizardStep(5); // Final Step: Get Receipt
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to complete document uploads.');
      setUploadProgress('');
    } finally {
      setLoading(false);
    }
  };

  // --- LOOKUP & SCREENSHOT PROOF ---
  const handleStatusLookup = async (e) => {
    e.preventDefault();
    const phoneVal = lookupType === 'phone' ? lookupPhone.trim() : '';
    const aadharVal = lookupType === 'aadhar' ? lookupAadhar.trim() : '';
    const dobVal = lookupDob.trim();

    if (!dobVal) {
      alert('Please enter your Date of Birth.');
      return;
    }
    if (lookupType === 'phone' && !phoneVal) {
      alert('Please enter your Phone number.');
      return;
    }
    if (lookupType === 'aadhar' && !aadharVal) {
      alert('Please enter your Aadhaar number.');
      return;
    }

    setLoading(true);
    try {
      const data = await getUserStatus(phoneVal, dobVal, aadharVal);
      setUserApplications(data);
      setHasSearchedStatus(true);
    } catch (err) {
      console.error(err);
      alert(err.message || 'No submissions found with these credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Load submissions automatically if logged-in user clicks Status tab
  useEffect(() => {
    if (activeTab === 'status' && currentUser) {
      const loadUserSubmissions = async () => {
        try {
          const data = await getUserStatus(currentUser.phone, currentUser.dob, currentUser.aadhar);
          setUserApplications(data);
          setHasSearchedStatus(true);
        } catch (e) {
          console.error(e);
        }
      };
      loadUserSubmissions();
    }
  }, [activeTab, currentUser]);

  const handleScreenshotUpload = async (subId, file) => {
    if (!file) return;
    setUploadingScreenshotId(subId);
    try {
      await uploadPaymentScreenshot(subId, file);
      alert('Payment proof uploaded successfully! Admin will verify your payment details.');
      
      // Refresh list
      const phoneVal = currentUser?.phone || lookupPhone;
      const dobVal = currentUser?.dob || lookupDob;
      const aadharVal = currentUser?.aadhar || lookupAadhar;
      const data = await getUserStatus(phoneVal, dobVal, aadharVal);
      setUserApplications(data);
    } catch (err) {
      console.error(err);
      alert('Failed to upload screenshot.');
    } finally {
      setUploadingScreenshotId(null);
    }
  };

  const handleUpiPay = (fee, submissionId) => {
    const pa = "9385497906@upi";
    const pn = encodeURIComponent("WhatsBro TNService");
    const am = fee;
    const cu = "INR";
    const tn = encodeURIComponent(`WhatsBro_Pay_${submissionId}`);
    const tr = `WhatsBro_Pay_${submissionId}`;
    
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    let payUrl = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}&tr=${tr}`;
    
    if (/android/i.test(userAgent)) {
      // Android: Google Pay deep link via Chrome Intent
      payUrl = `intent://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}&tr=${tr}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      // iOS: Google Pay deep link via custom scheme
      payUrl = `gpay://upi/pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}&tr=${tr}`;
    }
    
    window.location.href = payUrl;
  };

  const printReceipt = () => {
    const printContent = document.getElementById('receipt-downloadable-card').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <div style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 40px auto; border: 2px dashed #10b981; border-radius: 12px; background: white; color: #1e293b;">
        ${printContent}
      </div>
    `;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  // --- CATEGORIES HELPER ---
  const filteredForms = selectedCategory === 'all'
    ? forms
    : forms.filter(f => f.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ flex: 1 }}>
        {error && (
          <div className="premium-card" style={{ borderLeft: '4px solid var(--error)', background: '#fee2e2', color: '#991b1b', margin: '16px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {/* --- TAB 1: HOME POSTS --- */}
        {activeTab === 'home' && (
          <div className="desktop-grid-2" style={{ padding: '0 8px' }}>
            {posts.length === 0 ? (
              <div className="premium-card text-center" style={{ padding: '40px 20px' }}>
                <p className="text-muted">No services published yet.</p>
              </div>
            ) : (
              posts.map((post) => {
                const getImageUrl = (url) => {
                  if (!url) return '';
                  if (url.startsWith('http://') || url.startsWith('https://')) return url;
                  return `http://${window.location.hostname}:8000${url}`;
                };

                return (
                  <div key={post.id} className="instagram-post-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-light-main)', margin: 0, lineHeight: '1.3' }}>
                      {post.title}
                    </h3>

                    {post.img_url && post.img_url.trim() !== '' && (
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', background: '#fafafa', maxHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={getImageUrl(post.img_url)} 
                          style={{ width: '100%', maxHeight: '280px', objectFit: 'contain' }} 
                          alt={post.title} 
                        />
                      </div>
                    )}

                    <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                      {post.description}
                    </p>

                    {post.apply_url && post.apply_url.trim() !== '' && post.apply_url.trim().toLowerCase() !== 'none' && (
                      <button 
                        onClick={() => {
                          if (post.apply_url.startsWith('/user')) {
                            const urlParams = new URLSearchParams(post.apply_url.split('?')[1]);
                            setSearchParams(urlParams);
                          } else {
                            window.open(post.apply_url, '_blank');
                          }
                        }}
                        className="premium-btn premium-btn-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', marginTop: '4px', width: '100%', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Apply Now <ChevronRight size={18} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- TAB 2: CERTIFICATE APPLICATIONS WIZARD --- */}
        {activeTab === 'apply' && (
          <div>
            {!selectedForm ? (
              // Form selections
              <div style={{ padding: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 10px 0' }}>
                  <Filter size={16} className="text-muted" />
                  <span className="premium-label" style={{ margin: 0 }}>Service Category Filter</span>
                </div>
                
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="premium-input"
                  style={{ marginBottom: '16px', background: 'white' }}
                >
                  <option value="all">All Categories</option>
                  <option value="E sevai">E Sevai</option>
                  <option value="pan card">PAN Card</option>
                  <option value="voter id">Voter ID</option>
                  <option value="others">Others</option>
                </select>
 
                {filteredForms.length === 0 ? (
                  <div className="premium-card text-center" style={{ padding: '40px 20px' }}>
                    <p className="text-muted">No form templates found in this category.</p>
                  </div>
                ) : (
                  <div className="desktop-grid-2">
                    {filteredForms.map((form) => (
                      <div key={form.id} className="premium-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span className="badge badge-info">{form.category}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>Online Wizard</span>
                        </div>
                        <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{form.title}</h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '16px' }}>{form.description}</p>
                        <button 
                          onClick={() => selectFormToFill(form)}
                          className="premium-btn premium-btn-primary"
                          style={{ padding: '10px' }}
                        >
                          Start Application
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Active 5-Step Application Wizard
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <button onClick={() => setSelectedForm(null)} className="premium-btn premium-btn-secondary" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h3 style={{ fontSize: '1rem' }}>{selectedForm.title}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>Apply Wizard - Step {wizardStep} of 5</p>
                  </div>
                </div>

                {/* Highly refined HSL-themed 5 Step progress path */}
                <div className="step-wizard" style={{ marginTop: '16px' }}>
                  <div className="step-wizard-line" style={{ height: '3px', background: '#cbd5e1' }}></div>
                  <div className="step-wizard-progress" style={{ 
                    height: '3px',
                    background: 'var(--primary)',
                    width: `${((wizardStep - 1) / 4) * 100}%` 
                  }}></div>
                  {[1, 2, 3, 4, 5].map(step => (
                    <div 
                      key={step} 
                      className={`step-node ${wizardStep >= step ? 'completed' : ''}`}
                      style={{
                        width: '30px',
                        height: '30px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        backgroundColor: wizardStep >= step ? 'var(--primary)' : '#e2e8f0',
                        color: wizardStep >= step ? '#ffffff' : '#64748b',
                        border: wizardStep === step ? '2px solid #ffffff' : 'none',
                        boxShadow: wizardStep === step ? '0 0 0 2px var(--primary)' : 'none'
                      }}
                    >
                      {step}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '-10px 16px 20px 16px', fontSize: '0.65rem', color: 'var(--text-light-muted)', fontWeight: 700 }}>
                  <span>Instructions</span>
                  <span>Fill Form</span>
                  <span>Preview</span>
                  <span>Upload Docs</span>
                  <span>Receipt</span>
                </div>

                {/* STEP 1: INSTRUCTIONS & TERMS */}
                {wizardStep === 1 && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '0 0 20px 0' }}>
                      <h4 style={{ fontSize: '1rem', marginBottom: '8px', color: '#1e293b' }}>Application Guide & Terms</h4>
                      {selectedForm.description && (
                        <p style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '500', marginBottom: '12px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                          <strong>Service Description:</strong> {selectedForm.description}
                        </p>
                      )}
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                        Please read the following instructions carefully before starting the application.
                      </p>

                      <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <h5 style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Instructions List:</h5>
                        {selectedForm.instructions ? (
                          <ul style={{ paddingLeft: '20px', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
                            {selectedForm.instructions.split('\n').filter(Boolean).map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>No instructions configured by admin. Please fill the details in the next steps.</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#065f46' }}>E-Gov Processing & Service Fee:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>Rs. {selectedForm.fee || 0}</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleProceedToForm}
                      className="premium-btn premium-btn-primary"
                      style={{ marginBottom: '20px' }}
                    >
                      I Agree, Proceed <ChevronRight size={18} />
                    </button>
                  </div>
                )}

                {/* STEP 2: FILL OR VERIFY DATA */}
                {wizardStep === 2 && (
                  <form onSubmit={handleValidateForm} style={{ padding: '0 16px' }}>
                    {/* Non Logged-in Alert */}
                    {!currentUser && (
                      selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' ? (
                        <div className="premium-card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', color: '#991b1b', margin: '0 0 16px 0', padding: '12px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                            <ShieldAlert size={16} /> E-Sevai CAN Registration Required
                          </h4>
                          <p style={{ fontSize: '0.75rem', margin: 0 }}>
                            Guest User: E-Sevai services require a Citizen Access Number (CAN) profile. <strong>We will automatically register your account and store your CAN Details</strong> on submission!
                            <br />
                            <span onClick={onLoginTrigger} style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>Click here to Login</span> if you already have a profile.
                          </p>
                        </div>
                      ) : (
                        <div className="premium-card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', color: '#991b1b', margin: '0 0 16px 0', padding: '12px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                            <ShieldAlert size={16} /> Guest Application Notice
                          </h4>
                          <p style={{ fontSize: '0.75rem', margin: 0 }}>
                            You are currently filling this form as a Guest. <strong>We will automatically register your account on submission</strong> using your DOB and Phone, saving these values so they pre-fill next time!
                            <br />
                            <span onClick={onLoginTrigger} style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>Click here to Login</span> if you already have a profile.
                          </p>
                        </div>
                      )
                    )}

                    {currentUser && (
                      selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' ? (
                        !(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name) ? (
                          /* Case 1: First-time user / Incomplete CAN Details */
                          <div className="premium-card" style={{ borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb', color: '#78350f', margin: '0 0 16px 0', padding: '12px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                              <AlertCircle size={16} /> First-time E-Sevai Citizen Registration (Case 1)
                            </h4>
                            <p style={{ fontSize: '0.75rem', margin: 0 }}>
                              Welcome, <strong>{currentUser.name}</strong>! We could not find any pre-existing CAN Details for your account. Please fill in the complete CAN citizen registration form below; <strong>these values will be securely stored as your default profile data</strong> for all future applications!
                            </p>
                          </div>
                        ) : (
                          /* Case 2: Existing User with stored CAN Details */
                          <div className="premium-card" style={{ borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4', color: '#065f46', margin: '0 0 16px 0', padding: '12px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                              <CheckCircle size={16} style={{ color: '#10b981' }} /> Stored CAN Profile Loaded (Case 2)
                            </h4>
                            <p style={{ fontSize: '0.75rem', margin: 0 }}>
                              Hello, <strong>{currentUser.name}</strong>! Your stored E-Sevai CAN Profile pre-data has been successfully loaded. If any details have changed, <strong>you can directly correct them below</strong> and we will synchronize them back to your stored profile instantly.
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="premium-card" style={{ borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4', color: '#065f46', margin: '0 0 16px 0', padding: '10px 14px' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: '500', margin: 0 }}>
                            Logged In: <strong>{currentUser.name}</strong>. Stored profile values have been prefilled. <strong>Any corrections you make below will automatically update your stored profile!</strong>
                          </p>
                        </div>
                      )
                    )}

                    <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '0 0 20px 0' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '16px', color: '#1e293b' }}>Application Data Form</h4>
                      
                      {/* Render checklist fields chosen by Admin */}
                      {(() => {
                        let fieldsConfig = safeJsonParse(selectedForm.required_fields, []);
                        const isCase2 = currentUser && !!(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name);
                        
                        if (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' && !isCase2) {
                          const canFields = [
                            'aadhar', 'phone', 'name', 'name_tamil', 'gender', 'marital_status', 'dob',
                            'father_name', 'mother_name', 'father_name_tamil', 'mother_name_tamil',
                            'religion', 'community', 'state', 'district', 'taluk', 'revenue_village',
                            'street_name', 'door_no', 'pincode', 'address'
                          ];
                          fieldsConfig = Array.from(new Set([...canFields, ...fieldsConfig]));
                        }
                        
                        return fieldsConfig.map(fieldId => {
                          const fieldConfig = STANDARD_FIELDS[fieldId];
                          if (!fieldConfig) return null;
                          const isRequired = fieldConfig.required || (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai');

                          return (
                            <div key={fieldId} className="premium-input-group">
                              <label className="premium-label">
                                {fieldConfig.label} {isRequired && <span style={{ color: 'var(--error)' }}>*</span>}
                              </label>
                              
                              {fieldConfig.type === 'select' ? (
                                <select
                                  value={formData[fieldId] || ''}
                                  onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                                  className="premium-input"
                                  required={isRequired}
                                >
                                  <option value="">-- Select option --</option>
                                  {fieldConfig.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : fieldConfig.type === 'textarea' ? (
                                <textarea
                                  value={formData[fieldId] || ''}
                                  onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                                  placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
                                  rows={3}
                                  className="premium-input"
                                  required={isRequired}
                                />
                              ) : (
                                <input
                                  type={fieldConfig.type}
                                  value={formData[fieldId] || ''}
                                  onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                                  className="premium-input"
                                  placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
                                  required={isRequired}
                                />
                              )}
                            </div>
                          );
                        });
                      })()}

                      {/* Render custom input fields added by Admin */}
                      {safeJsonParse(selectedForm.fields, []).map(f => (
                        <div key={f.id} className="premium-input-group">
                          <label className="premium-label">{f.label} {f.required && <span style={{ color: 'var(--error)' }}>*</span>}</label>
                          {f.type === 'textarea' ? (
                            <textarea
                              value={formData[f.id] || ''}
                              onChange={(e) => handleFieldChange(f.id, e.target.value)}
                              rows={3}
                              className="premium-input"
                              placeholder="Enter details..."
                              required={f.required}
                            />
                          ) : f.type === 'select' ? (
                            <select
                              value={formData[f.id] || ''}
                              onChange={(e) => handleFieldChange(f.id, e.target.value)}
                              className="premium-input"
                              required={f.required}
                            >
                              <option value="">-- Choose option --</option>
                              {f.options && f.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : f.type === 'checkbox' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              {f.options && f.options.map(opt => {
                                const currentVals = Array.isArray(formData[f.id]) ? formData[f.id] : (formData[f.id] ? formData[f.id].split(', ') : []);
                                const isChecked = currentVals.includes(opt);
                                return (
                                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: '#1e293b' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const nextVals = e.target.checked
                                          ? [...currentVals, opt]
                                          : currentVals.filter(v => v !== opt);
                                        handleFieldChange(f.id, nextVals.join(', '));
                                      }}
                                    />
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : f.type === 'radio' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              {f.options && f.options.map(opt => (
                                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: '#1e293b' }}>
                                  <input
                                    type="radio"
                                    name={`custom-radio-${f.id}`}
                                    checked={formData[f.id] === opt}
                                    onChange={() => handleFieldChange(f.id, opt)}
                                    required={f.required}
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <input
                              type={f.type}
                              value={formData[f.id] || ''}
                              onChange={(e) => handleFieldChange(f.id, e.target.value)}
                              className="premium-input"
                              placeholder="Type answer..."
                              required={f.required}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <button 
                      type="submit" 
                      className="premium-btn premium-btn-primary"
                      style={{ marginBottom: '20px' }}
                    >
                      Verify Details <ChevronRight size={18} />
                    </button>
                  </form>
                )}

                {/* STEP 3: PREVIEW */}
                {wizardStep === 3 && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card" style={{ borderLeft: '4px solid var(--primary)', margin: '0 0 16px 0' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '4px', color: '#1e293b' }}>Summary Preview</h4>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Review all form values before locking application.</p>
                    </div>

                    <div className="premium-card" style={{ margin: '0 0 16px 0' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '10px' }}>Application Information</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Map and show filled form data */}
                        {Object.entries(formData).map(([key, value]) => {
                          let label = key;
                          if (STANDARD_FIELDS[key]) {
                            label = STANDARD_FIELDS[key].label;
                          } else if (selectedForm.fields) {
                            const dyn = safeJsonParse(selectedForm.fields, []).find(f => f.id === key);
                            if (dyn) label = dyn.label;
                          }
                          return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span className="text-muted">{label}:</span>
                              <span style={{ fontWeight: 700, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{value || '—'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="premium-card" style={{ margin: '0 0 20px 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', color: '#1e293b' }}>
                        <input 
                          type="checkbox"
                          checked={agreeCheckbox}
                          onChange={(e) => setAgreeCheckbox(e.target.checked)}
                        />
                        <span>I hereby declare that all entries made in this form are correct and true to the best of my knowledge.</span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                      <button onClick={() => setWizardStep(2)} className="premium-btn premium-btn-secondary" style={{ flex: 1 }}>Previous</button>
                      <button onClick={handleProceedToUploads} className="premium-btn premium-btn-primary" style={{ flex: 2 }}>Proceed to Docs <ChevronRight size={18} /></button>
                    </div>
                  </div>
                )}

                {/* STEP 4: UPLOAD DOCS WITH FILE SIZE / DUAL SELECTOR */}
                {wizardStep === 4 && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '0 0 20px 0' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '4px', color: '#1e293b' }}>Upload Required Documents</h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '16px' }}>Attach certificate uploads. Photo must be &lt; 7MB, other files &lt; 5MB.</p>

                      {/* Loading status bar */}
                      {uploadProgress && (
                        <div style={{ padding: '12px', background: '#f0fdf4', borderLeft: '4px solid #10b981', borderRadius: '4px', marginBottom: '16px', fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                          {uploadProgress}
                        </div>
                      )}

                      {/* Dynamic docs list (chosen by Admin) */}
                      {safeJsonParse(selectedForm.required_docs, []).map(docKey => {
                        const localFile = uploadedFiles[docKey] || {};
                        
                        // Get saved profile URL
                        const getSavedDocUrl = () => {
                          if (!currentUser) return null;
                          if (docKey === 'photo') return currentUser.photo_url;
                          if (docKey === 'signature') return currentUser.signature_url_1;
                          return currentUser[`${docKey}_url_1`] || currentUser[`${docKey}_url` || ''];
                        };
                        
                        const savedUrl = getSavedDocUrl();
                        const hasSavedDoc = !!savedUrl && !deletedSavedDocs[docKey];
                        
                        // Handle dual image vs PDF toggle state
                        const selectedType = localFile.type || 'pdf';

                        if (hasSavedDoc) {
                          // Render beautiful premium small preview card with Replace/Delete button
                          return (
                            <div key={docKey} className="document-upload-zone" style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #10b981', background: '#f0fdf4', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Small Display Thumbnail */}
                                {savedUrl.toLowerCase().endsWith('.pdf') ? (
                                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                    <FileText size={22} />
                                  </div>
                                ) : (
                                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img 
                                      src={`http://${window.location.hostname}:8000${savedUrl}`} 
                                      alt="Preview" 
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                  </div>
                                )}
                                
                                <div>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize', display: 'block' }}>
                                    {STANDARD_FIELDS[docKey]?.label || docKey} <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>[Saved]</span>
                                  </span>
                                  <a 
                                    href={`http://${window.location.hostname}:8000${savedUrl}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{ fontSize: '0.75rem', color: '#047857', textDecoration: 'underline', fontWeight: '700' }}
                                  >
                                    View File
                                  </a>
                                </div>
                              </div>
                              {/* Delete/Replace button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteSavedDoc(docKey)}
                                className="premium-btn premium-btn-danger"
                                style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
                              >
                                <Trash2 size={14} /> Delete & Replace
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div key={docKey} className="document-upload-zone" style={{ padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize' }}>
                                {STANDARD_FIELDS[docKey]?.label || docKey} <span style={{ color: 'var(--error)' }}>*</span>
                              </span>
                            </div>

                            {/* Options Toggle for Aadhaar, Voter, Smart Card (images vs PDF) */}
                            {docKey !== 'photo' && docKey !== 'signature' && (
                              <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '6px', padding: '2px', border: '1px solid #cbd5e1', marginBottom: '10px', maxWidth: '240px' }}>
                                <button
                                  type="button"
                                  onClick={() => setUploadedFiles(prev => ({ ...prev, [docKey]: { ...prev[docKey], type: 'pdf' } }))}
                                  style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    backgroundColor: selectedType === 'pdf' ? '#10b981' : 'transparent',
                                    color: selectedType === 'pdf' ? '#ffffff' : '#64748b',
                                    cursor: 'pointer'
                                  }}
                                >
                                  One PDF File
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUploadedFiles(prev => ({ ...prev, [docKey]: { ...prev[docKey], type: 'images' } }))}
                                  style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    backgroundColor: selectedType === 'images' ? '#10b981' : 'transparent',
                                    color: selectedType === 'images' ? '#ffffff' : '#64748b',
                                    cursor: 'pointer'
                                  }}
                                >
                                  2 Images (Front/Back)
                                </button>
                              </div>
                            )}

                            {/* Render Upload inputs */}
                            {docKey === 'photo' || docKey === 'signature' || selectedType === 'pdf' ? (
                              // Single Input (PDF/Image)
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label className="premium-btn premium-btn-secondary" style={{ padding: '10px', fontSize: '0.8rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1px dashed var(--primary)' }}>
                                  <Upload size={16} style={{ color: 'var(--primary)' }} />
                                  <span>{localFile.file1 ? localFile.file1.name : 'Choose PDF / Image File'}</span>
                                  <input 
                                    type="file" 
                                    accept={['photo', 'signature'].includes(docKey) ? 'image/*' : 'application/pdf,image/*'}
                                    onChange={(e) => handleFileChange(docKey, 'pdf', 1, e.target.files[0])}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                              </div>
                            ) : (
                              // Dual Side Image Inputs (Front & Back)
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Front Side Image:</span>
                                  <label className="premium-btn premium-btn-secondary" style={{ padding: '8px', fontSize: '0.75rem', display: 'flex', gap: '4px', cursor: 'pointer', background: 'white', border: '1px dashed var(--primary)' }}>
                                    <Upload size={14} style={{ color: 'var(--primary)' }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                                      {localFile.file1 ? localFile.file1.name : 'Select Front'}
                                    </span>
                                    <input 
                                      type="file" 
                                      accept="image/*"
                                      onChange={(e) => handleFileChange(docKey, 'images', 1, e.target.files[0])}
                                      style={{ display: 'none' }}
                                    />
                                  </label>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Back Side Image:</span>
                                  <label className="premium-btn premium-btn-secondary" style={{ padding: '8px', fontSize: '0.75rem', display: 'flex', gap: '4px', cursor: 'pointer', background: 'white', border: '1px dashed var(--primary)' }}>
                                    <Upload size={14} style={{ color: 'var(--primary)' }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                                      {localFile.file2 ? localFile.file2.name : 'Select Back'}
                                    </span>
                                    <input 
                                      type="file" 
                                      accept="image/*"
                                      onChange={(e) => handleFileChange(docKey, 'images', 2, e.target.files[0])}
                                      style={{ display: 'none' }}
                                    />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Custom Documents list */}
                      {safeJsonParse(selectedForm.custom_docs, []).map(docLabel => {
                        const localFile = uploadedFiles[docLabel] || {};
                        return (
                          <div key={docLabel} className="document-upload-zone" style={{ padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', marginBottom: '16px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                              {docLabel} <span style={{ color: 'var(--error)' }}>*</span>
                            </span>
                            <label className="premium-btn premium-btn-secondary" style={{ padding: '10px', fontSize: '0.8rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1px dashed var(--primary)' }}>
                              <Upload size={16} style={{ color: 'var(--primary)' }} />
                              <span>{localFile.file1 ? localFile.file1.name : 'Choose File (PDF / Image)'}</span>
                              <input 
                                type="file" 
                                accept="application/pdf,image/*"
                                onChange={(e) => handleFileChange(docLabel, 'pdf', 1, e.target.files[0])}
                                style={{ display: 'none' }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                      <button onClick={() => setWizardStep(3)} className="premium-btn premium-btn-secondary" style={{ flex: 1 }}>Previous</button>
                      <button 
                        onClick={handleFinalWizardSubmit} 
                        disabled={loading}
                        className="premium-btn premium-btn-primary" 
                        style={{ flex: 2 }}
                      >
                        {loading ? 'Uploading Docs...' : 'Submit Application'}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: RECEIPT */}
                {wizardStep === 5 && submissionResult && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card text-center" style={{ margin: '0 0 16px 0', borderBottom: '4px solid var(--success)' }}>
                      <CheckCircle size={44} style={{ color: 'var(--success)', margin: '0 auto 10px auto' }} />
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', color: '#1e293b' }}>Application Submitted!</h3>
                      <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Your application has been stored securely in WhatsBro database.</p>
                    </div>

                    <div className="receipt-wrapper" id="receipt-downloadable-card" style={{ display: 'none' }}>
                      <div className="receipt-watermark" style={{ opacity: 0.05, fontSize: '2.5rem', color: '#10b981' }}>WHATSBRO</div>
                      <div className="receipt-header" style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '1.25rem', color: '#047857', margin: '0 0 6px 0', fontWeight: '900', textTransform: 'uppercase' }}>{selectedForm.title}</h4>
                        <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700', display: 'block', marginBottom: '4px' }}>WHATSBRO TNSERVICE</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Official E-Governance Receipt</span>
                      </div>
                      
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Receipt ID:</span>
                        <span className="receipt-item-val" style={{ color: '#10b981', fontWeight: '700' }}>{submissionResult.id}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Service Applied:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{selectedForm.title}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Aadhaar Number:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{submissionResult.aadhar.replace(/(\d{4})/g, '$1 ').trim()}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Phone Number:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{submissionResult.phone}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Submission Date:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{new Date(submissionResult.submitted_at).toLocaleDateString()}</span>
                      </div>
 
                      <div style={{ borderTop: '1px dashed #cbd5e1', margin: '14px 0', paddingTop: '10px' }}>
                        <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', alignItems: 'center' }}>
                           <span className="receipt-item-label" style={{ color: '#64748b' }}>Service Fee (INR):</span>
                           <span className="receipt-item-val" style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>Rs. {selectedForm.fee || 0}</span>
                        </div>
                        <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                           <span className="receipt-item-label" style={{ color: '#64748b' }}>Verification Status:</span>
                           <span className={`receipt-item-val badge ${submissionResult.payment_status === 'paid' ? 'badge-success' : submissionResult.payment_screenshot ? 'badge-warning' : 'badge-danger'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                            {(submissionResult.payment_status || 'unpaid').toUpperCase()}
                           </span>
                        </div>
                      </div>
 
                      {/* Instant screenshot upload direct link in Receipt */}
                      {submissionResult.payment_status !== 'paid' && (() => {
                        const fee = selectedForm.fee || 0;
                        const upiUrl = `upi://pay?pa=9385497906@upi&pn=WhatsBro%20TNService&am=${fee}&cu=INR&tn=WhatsBro_Pay_${submissionResult.id}`;
                        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;

                        return (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                            <h4 style={{ fontSize: '0.85rem', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                              <CreditCard size={15} style={{ color: 'var(--primary)' }} /> UPI Payment Transfer
                            </h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                              {/* Amount Display */}
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', display: 'block', textTransform: 'uppercase' }}>Amount to Pay</span>
                                <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#10b981' }}>₹{fee}</span>
                              </div>

                              {/* QR Code */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '6px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                <img 
                                  src={qrCodeUrl} 
                                  alt="UPI Payment QR Code" 
                                  style={{ width: '120px', height: '120px' }} 
                                />
                                <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 'bold' }}>Scan to Pay using GPAY / any UPI</span>
                              </div>

                              {/* Intent pay button */}
                              <button 
                                onClick={() => handleUpiPay(fee, submissionResult.id)}
                                className="premium-btn"
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  gap: '8px', 
                                  padding: '10px 16px', 
                                  width: '100%', 
                                  maxWidth: '220px', 
                                  fontSize: '0.8rem', 
                                  fontWeight: '800',
                                  borderRadius: '8px',
                                  background: '#000000',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  transition: 'all 0.25s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.03)';
                                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '2px' }}>
                                  <path fill="#4285F4" d="M24 12.27c0-.81-.07-1.59-.2-2.34H12v4.42h6.08c-.26 1.39-1.04 2.57-2.21 3.34v2.73h3.64c2.13-1.96 3.36-4.85 3.36-8.15z"/>
                                  <path fill="#34A853" d="M12 24c3.04 0 5.58-1.01 7.44-2.73l-3.64-2.73c-1.01.68-2.3 1.08-3.8 1.08-2.92 0-5.39-1.97-6.27-4.62H2.04v2.81C3.88 21.05 7.55 24 12 24z"/>
                                  <path fill="#FBBC05" d="M5.73 15.02c-.22-.68-.35-1.41-.35-2.18s.13-1.5.35-2.18V7.85H2.04c-.7 1.4-1.1 2.97-1.1 4.63s.4 3.23 1.1 4.63l3.69-2.87z"/>
                                  <path fill="#EA4335" d="M12 4.8c1.64 0 3.11.56 4.27 1.66l3.2-3.2C17.58 1.44 15.04 0 12 0 7.55 0 3.88 2.95 2.04 7.02l3.69 2.87c.88-2.65 3.35-4.62 6.27-4.62z"/>
                                </svg>
                                Pay with <span style={{ fontWeight: '800', letterSpacing: '-0.2px' }}>GPay</span>
                              </button>

                              {/* Direct number */}
                              <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '100%' }}>
                                <p style={{ fontSize: '0.7rem', color: '#475569', margin: '0 0 2px 0' }}>
                                  Or send direct via GPay / UPI to number:
                                </p>
                                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#1e293b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                  9385497906
                                </span>
                              </div>
                            </div>

                            <label className="premium-btn premium-btn-success" style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', gap: '8px', cursor: 'pointer', justifyContent: 'center' }}>
                              <UploadCloud size={16} /> 
                              {uploadingScreenshotId === submissionResult.id ? 'Uploading proof...' : 'Select Payment Proof (Image or PDF File)'}
                              <input 
                                type="file" 
                                accept="image/*,application/pdf"
                                style={{ display: 'none' }}
                                disabled={uploadingScreenshotId !== null}
                                onChange={(e) => handleScreenshotUpload(submissionResult.id, e.target.files[0])}
                              />
                            </label>
                          </div>
                        );
                      })()}
 
                      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.7rem', color: '#94a3b8' }}>
                        Thank you for using WhatsBro TNService! Save this receipt for status lookups.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                      <button 
                        onClick={printReceipt} 
                        className="premium-btn premium-btn-success"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Printer size={18} /> Download PDF Receipt
                      </button>
                      <button 
                        onClick={() => handleTabChange('status')}
                        className="premium-btn premium-btn-primary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <CheckCircle size={18} /> Payment & Status Check
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: APPLICATION STATUS TRACKING & LOOKUP --- */}
        {activeTab === 'status' && (
          <div style={{ padding: '0 16px' }}>
            
            {/* If logged in: show status immediately. If guest: show search form first */}
            {!currentUser && (
              <form onSubmit={handleStatusLookup} className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '16px 0' }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '6px', color: '#1e293b' }}>Enquire Application Status</h3>
                <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '16px' }}>Verify status of submitted certificates using your registered credentials.</p>

                {/* Lookup Identifier Type selector */}
                <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '8px', padding: '2px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setLookupType('phone'); setHasSearchedStatus(false); }}
                    style={{
                      flex: 1,
                      padding: '6px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: lookupType === 'phone' ? '#10b981' : 'transparent',
                      color: lookupType === 'phone' ? '#ffffff' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    Use Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLookupType('aadhar'); setHasSearchedStatus(false); }}
                    style={{
                      flex: 1,
                      padding: '6px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: lookupType === 'aadhar' ? '#10b981' : 'transparent',
                      color: lookupType === 'aadhar' ? '#ffffff' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    Use Aadhaar
                  </button>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Date of Birth *</label>
                  <input 
                    type="date" 
                    value={lookupDob} 
                    onChange={(e) => setLookupDob(e.target.value)} 
                    className="premium-input" 
                    required 
                  />
                </div>

                {lookupType === 'phone' ? (
                  <div className="premium-input-group">
                    <label className="premium-label">Phone Number *</label>
                    <input 
                      type="tel" 
                      value={lookupPhone} 
                      onChange={(e) => setLookupPhone(e.target.value)} 
                      placeholder="10-digit Phone Number" 
                      maxLength={10} 
                      className="premium-input" 
                      required 
                    />
                  </div>
                ) : (
                  <div className="premium-input-group">
                    <label className="premium-label">Aadhaar Number *</label>
                    <input 
                      type="text" 
                      value={lookupAadhar} 
                      onChange={(e) => setLookupAadhar(e.target.value.replace(/\D/g, ''))} 
                      placeholder="12-digit Aadhaar Number" 
                      maxLength={12} 
                      className="premium-input" 
                      required 
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="premium-btn premium-btn-primary"
                >
                  {loading ? 'Searching...' : 'Enquire Status'}
                </button>
              </form>
            )}

            {/* Results Board */}
            {hasSearchedStatus && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', margin: 0, color: '#1e293b' }}>
                    Active Submissions ({userApplications.length})
                  </h4>
                  {!currentUser && (
                    <button 
                      onClick={() => setHasSearchedStatus(false)}
                      className="premium-btn premium-btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.7rem', width: 'auto' }}
                    >
                      New Search
                    </button>
                  )}
                </div>

                {userApplications.length === 0 ? (
                  <div className="premium-card text-center" style={{ padding: '40px 20px' }}>
                    <p className="text-muted">No applications found with these credentials.</p>
                  </div>
                ) : (
                  userApplications.map((app) => (
                    <div key={app.id} className="premium-card" style={{ borderLeft: '4px solid var(--primary)', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', color: '#1e293b', fontWeight: '800', marginBottom: '2px' }}>
                            {forms.find(f => f.id === app.form_id)?.title || 'Application Form'}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', display: 'block' }}>
                            Application ID: {app.id}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                            Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {app.uploaded_pdf_url ? (
                            <span className="badge badge-success" style={{ backgroundColor: '#10b981' }}>Received</span>
                          ) : app.info_request_label && !app.info_request_response ? (
                            <span className="badge badge-warning" style={{ backgroundColor: '#f59e0b' }}>Awaiting Upload</span>
                          ) : app.info_request_label && app.info_request_response ? (
                            <span className="badge badge-info" style={{ backgroundColor: '#3b82f6' }}>Upload Submitted</span>
                          ) : app.payment_status === 'paid' ? (
                            <span className="badge badge-success">Paid</span>
                          ) : app.payment_screenshot ? (
                            <span className="badge badge-warning">Verification Pending</span>
                          ) : (
                            <span className="badge badge-danger">Unpaid</span>
                          )}
                        </div>
                      </div>

                      {/* Payment Action for Unpaid Status */}
                      {app.payment_status === 'unpaid' && (() => {
                        const formTemplate = forms.find(f => f.id === app.form_id);
                        const fee = formTemplate?.fee || 0;
                        const upiUrl = `upi://pay?pa=9385497906@upi&pn=WhatsBro%20TNService&am=${fee}&cu=INR&tn=WhatsBro_Pay_${app.id}`;
                        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;

                        return (
                          <div style={{ 
                            background: '#f8fafc', 
                            border: '1.5px solid #e2e8f0', 
                            borderRadius: '12px', 
                            padding: '16px', 
                            margin: '12px 0 16px 0',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                          }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                              <CreditCard size={16} style={{ color: 'var(--primary)' }} /> UPI Payment Transfer
                            </h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                              
                              {/* Amount Display */}
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount to Pay</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#10b981' }}>₹{fee}</span>
                              </div>
                              
                              {/* QR Code Container */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                <img 
                                  src={qrCodeUrl} 
                                  alt="UPI Payment QR Code" 
                                  style={{ width: '130px', height: '130px' }} 
                                />
                                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>Scan QR Code with any UPI App</span>
                              </div>

                              {/* Pay Intent Button */}
                              <button 
                                onClick={() => handleUpiPay(fee, app.id)}
                                className="premium-btn"
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  gap: '8px', 
                                  padding: '10px 16px', 
                                  width: '100%', 
                                  maxWidth: '220px', 
                                  fontSize: '0.8rem', 
                                  fontWeight: '800',
                                  borderRadius: '8px',
                                  background: '#000000',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  transition: 'all 0.25s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.03)';
                                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '2px' }}>
                                  <path fill="#4285F4" d="M24 12.27c0-.81-.07-1.59-.2-2.34H12v4.42h6.08c-.26 1.39-1.04 2.57-2.21 3.34v2.73h3.64c2.13-1.96 3.36-4.85 3.36-8.15z"/>
                                  <path fill="#34A853" d="M12 24c3.04 0 5.58-1.01 7.44-2.73l-3.64-2.73c-1.01.68-2.3 1.08-3.8 1.08-2.92 0-5.39-1.97-6.27-4.62H2.04v2.81C3.88 21.05 7.55 24 12 24z"/>
                                  <path fill="#FBBC05" d="M5.73 15.02c-.22-.68-.35-1.41-.35-2.18s.13-1.5.35-2.18V7.85H2.04c-.7 1.4-1.1 2.97-1.1 4.63s.4 3.23 1.1 4.63l3.69-2.87z"/>
                                  <path fill="#EA4335" d="M12 4.8c1.64 0 3.11.56 4.27 1.66l3.2-3.2C17.58 1.44 15.04 0 12 0 7.55 0 3.88 2.95 2.04 7.02l3.69 2.87c.88-2.65 3.35-4.62 6.27-4.62z"/>
                                </svg>
                                Pay with <span style={{ fontWeight: '800', letterSpacing: '-0.2px' }}>GPay</span>
                              </button>

                              {/* Direct Details */}
                              <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '10px', width: '100%' }}>
                                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 4px 0', lineHeight: '1.4' }}>
                                  Alternatively, pay direct via GPay / PhonePe / Paytm to:
                                </p>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#1e293b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
                                  9385497906
                                </span>
                              </div>
                            </div>

                            {/* Screenshot Upload Block */}
                            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                              <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                                Upload Payment Screenshot (Image / PDF):
                              </span>
                              <label className="premium-btn premium-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', gap: '8px', cursor: 'pointer', background: 'white' }}>
                                <UploadCloud size={16} /> 
                                {uploadingScreenshotId === app.id ? 'Uploading proof...' : 'Select Payment Proof File'}
                                <input 
                                  type="file" 
                                  accept="image/*,application/pdf"
                                  style={{ display: 'none' }}
                                  disabled={uploadingScreenshotId !== null}
                                  onChange={(e) => handleScreenshotUpload(app.id, e.target.files[0])}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Info Request from Admin section */}
                      {app.info_request_label && (
                        <div style={{ 
                          background: '#fffbeb', 
                          border: '1.5px solid #fde68a', 
                          borderLeft: '5px solid #d97706', 
                          borderRadius: '12px', 
                          padding: '16px', 
                          margin: '16px 0',
                          boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.05)'
                        }}>
                          <h5 style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 'bold', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle size={15} style={{ color: '#d97706' }} /> Action Required: Upload Document / Information Requested by Admin
                          </h5>
                          <p style={{ fontSize: '0.75rem', color: '#78350f', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                            The administrator has requested the following: <strong style={{ color: '#9a3412', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>{app.info_request_label}</strong>
                          </p>

                          {!app.info_request_response ? (
                            // Render request submission input
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {app.info_request_type === 'file' ? (
                                <label className="premium-btn premium-btn-secondary" style={{ padding: '10px', fontSize: '0.8rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1.5px dashed #d97706', justifyContent: 'center' }}>
                                  <Upload size={16} style={{ color: '#d97706' }} />
                                  <span>{infoRequestFiles[app.id] ? infoRequestFiles[app.id].name : 'Select Image or PDF Document'}</span>
                                  <input 
                                    type="file" 
                                    accept="image/*,application/pdf"
                                    onChange={(e) => setInfoRequestFiles(prev => ({ ...prev, [app.id]: e.target.files[0] }))}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                              ) : (
                                <input 
                                  type="text" 
                                  value={infoRequestTexts[app.id] || ''} 
                                  onChange={(e) => setInfoRequestTexts(prev => ({ ...prev, [app.id]: e.target.value }))}
                                  placeholder="Type your answer response here..."
                                  className="premium-input"
                                  style={{ padding: '10px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1' }}
                                />
                              )}
                              
                              <button
                                type="button"
                                onClick={() => handleInfoRequestSubmit(app.id, app.info_request_type)}
                                className="premium-btn"
                                style={{ 
                                  backgroundColor: '#d97706', 
                                  color: 'white', 
                                  padding: '10px', 
                                  fontSize: '0.8rem', 
                                  fontWeight: 'bold',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
                                }}
                              >
                                Submit Requested Details
                              </button>
                            </div>
                          ) : (
                            // Premium Render Response Preview with Download / View options
                            <div style={{ background: '#f59e0b', color: 'white', padding: '12px', borderRadius: '10px', fontSize: '0.75rem', border: '1px solid #d97706' }}>
                              <span style={{ fontWeight: '800', display: 'block', marginBottom: '8px', color: '#fef3c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Submitted Response:</span>
                              
                              {app.info_request_response.startsWith('/uploads/') ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'rgba(255, 255, 255, 0.1)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {app.info_request_response.toLowerCase().endsWith('.pdf') ? (
                                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                        <FileText size={16} />
                                      </div>
                                    ) : (
                                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={`http://${window.location.hostname}:8000${app.info_request_response}`} alt="Response Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      </div>
                                    )}
                                    <span style={{ fontWeight: 'bold' }}>Uploaded Document</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <a 
                                      href={`http://${window.location.hostname}:8000${app.info_request_response}`} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      style={{ color: 'white', background: 'rgba(255, 255, 255, 0.15)', textDecoration: 'none', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(255,255,255,0.25)' }}
                                    >
                                      <Eye size={11} /> View
                                    </a>
                                    <a 
                                      href={`http://${window.location.hostname}:8000${app.info_request_response}`} 
                                      download
                                      target="_blank" 
                                      rel="noreferrer"
                                      style={{ color: '#b45309', background: '#ffffff', textDecoration: 'none', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                    >
                                      <Download size={11} /> Download
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', fontWeight: '700', color: '#ffffff' }}>
                                  {app.info_request_response}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status Percent bar */}
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                          <span className="text-muted">Application Processing Progress:</span>
                          <span style={{ color: 'var(--primary)' }}>{app.progress_percent}%</span>
                        </div>
                        <div className="progress-container">
                          <div className="progress-bar-fill" style={{ width: `${app.progress_percent}%` }}></div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '6px', lineHeight: '1.4' }}>
                          <strong>Current Update:</strong> {app.progress_desc || 'Form processed successfully.'}
                        </p>
                      </div>

                      {/* Documents Received from Admin */}
                      {(app.receipt_url || app.certificate_url || app.other_doc_url || app.uploaded_pdf_url) && (
                        <div style={{ marginTop: '16px', padding: '14px', background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <h5 style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 'bold', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileCheck size={16} style={{ color: '#16a34a' }} /> 📩 Received Documents from Administrator
                          </h5>
                          
                          {/* List of files helper */}
                          {(() => {
                            const docs = [
                              { key: 'receipt', title: 'Official Receipt', sub: 'Payment Receipt File', url: app.receipt_url },
                              { key: 'certificate', title: 'Official Certificate', sub: 'Processed Outcome Certificate', url: app.certificate_url },
                              { key: 'other', title: app.other_doc_name || 'Additional Document', sub: app.other_doc_name ? 'Official Custom Document' : 'Other uploaded attachment', url: app.other_doc_url },
                              { key: 'legacy', title: 'Processed Final Document', sub: 'Legacy outcome document', url: app.uploaded_pdf_url }
                            ].filter(d => !!d.url);

                            return docs.map(doc => {
                              const isPdf = doc.url.toLowerCase().endsWith('.pdf');
                              return (
                                <div key={doc.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'white', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {/* Mini PDF or Image Preview */}
                                    {isPdf ? (
                                      <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                        <FileText size={18} />
                                      </div>
                                    ) : (
                                      <div style={{ width: '38px', height: '38px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img 
                                          src={`http://${window.location.hostname}:8000${doc.url}`} 
                                          alt="Preview" 
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        />
                                      </div>
                                    )}
                                    <div style={{ textAlign: 'left' }}>
                                      <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: 'bold', display: 'block' }}>{doc.title}</span>
                                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{doc.sub} ({doc.url.split('.').pop().toUpperCase()})</span>
                                    </div>
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <a 
                                      href={`http://${window.location.hostname}:8000${doc.url}`} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="premium-btn premium-btn-secondary" 
                                      style={{ width: 'auto', padding: '6px 10px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                    >
                                      <Eye size={11} /> View
                                    </a>
                                    <a 
                                      href={`http://${window.location.hostname}:8000${doc.url}`} 
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
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
