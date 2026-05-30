const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS
app.use(cors({
    origin: '*',
    credentials: true,
    methods: '*',
    headers: '*'
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database configuration
const DB_PATH = path.join(__dirname, '../src/data.json');

function readDB() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            return { posts: [], forms: [], submissions: [], users: [] };
        }
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const db = JSON.parse(raw);
        if (!db.posts) db.posts = [];
        if (!db.forms) db.forms = [];
        if (!db.submissions) db.submissions = [];
        if (!db.users) db.users = [];
        return db;
    } catch (err) {
        console.error("Error reading JSON database:", err);
        return { posts: [], forms: [], submissions: [], users: [] };
    }
}

function writeDB(db) {
    try {
        const tempPath = DB_PATH + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf8');
        fs.renameSync(tempPath, DB_PATH);
    } catch (err) {
        console.error("Error writing JSON database, falling back to direct write:", err);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    }
}

// Helper to generate UUID-like short ID
function generateId(prefix = '') {
    return `${prefix}${crypto.randomBytes(4).toString('hex')}`;
}

// Setup Upload Directories
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const SCREENSHOTS_DIR = path.join(UPLOADS_DIR, 'screenshots');
const PDFS_DIR = path.join(UPLOADS_DIR, 'pdfs');
const POSTS_IMAGES_DIR = path.join(UPLOADS_DIR, 'posts');
const DOCUMENTS_DIR = path.join(UPLOADS_DIR, 'documents');

[UPLOADS_DIR, SCREENSHOTS_DIR, PDFS_DIR, POSTS_IMAGES_DIR, DOCUMENTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Serve uploads folder statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper to physically delete an uploaded file from disk
function deletePhysicalFile(relativeUrl) {
    if (!relativeUrl) return;
    try {
        // Strip out the leading "/uploads" or "/uploads/" to get the clean relative subpath
        const relativePath = relativeUrl.replace(/^\/uploads\//, '').replace(/^\/uploads/, '');
        const absolutePath = path.join(UPLOADS_DIR, relativePath);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`[File System] Physically deleted file: ${absolutePath}`);
        }
    } catch (e) {
        console.error(`[File System] Error deleting physical file ${relativeUrl}:`, e);
    }
}

// Multer Upload Configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const multiUpload = upload.fields([
    { name: 'file1', maxCount: 1 },
    { name: 'file2', maxCount: 1 }
]);

const singleUpload = upload.single('file');

// --- DATA SEEDING & MIGRATIONS ---
const defaultPosts = [
    {
        id: 1,
        title: "E-Sevai Quick Services",
        description: "Apply for Income Certificate, Community Certificate, and Nativity Certificate easily through our portal. Processing time: 3-5 working days.",
        img_url: "",
        apply_url: "/user?tab=apply&category=E%20sevai",
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        title: "New PAN Card & Corrections",
        description: "Get a new PAN Card in 7 working days or make corrections in your existing PAN Card (Name, DOB, or Photo) with simple document submission.",
        img_url: "",
        apply_url: "/user?tab=apply&category=pan%20card",
        created_at: new Date().toISOString()
    },
    {
        id: 3,
        title: "Voter ID Registration",
        description: "New Voter Registration, address updates, or replacement voter ID card applications are active. Track status securely.",
        img_url: "",
        apply_url: "/user?tab=apply&category=voter%20id",
        created_at: new Date().toISOString()
    }
];

const fieldsEsevai = [
    { id: "applicant_name", label: "Applicant Name", type: "text", required: true },
    { id: "father_name", label: "Father / Husband Name", type: "text", required: true },
    { id: "annual_income", label: "Annual Income (INR)", type: "number", required: true },
    { id: "income_source", label: "Source of Income", type: "select", required: true, options: ["Agriculture", "Business", "Private Job", "Government Job", "Daily Wage"] },
    { id: "ration_no", label: "Ration Card Number", type: "text", required: true }
];

const fieldsPancard = [
    { id: "full_name", label: "Full Name as per Aadhaar", type: "text", required: true },
    { id: "father_name", label: "Father's Full Name", type: "text", required: true },
    { id: "gender", label: "Gender", type: "select", required: true, options: ["Male", "Female", "Other"] },
    { id: "pancard_type", label: "Application Type", type: "select", required: true, options: ["New PAN Card", "PAN Correction", "Lost PAN Card Reissue"] }
];

const fieldsVoter = [
    { id: "voter_name", label: "Applicant Full Name", type: "text", required: true },
    { id: "constituency", label: "Assembly Constituency", type: "text", required: true },
    { id: "address", label: "Full Residential Address", type: "textarea", required: true },
    { id: "gender", label: "Gender", type: "select", required: true, options: ["Male", "Female", "Other"] }
];

const defaultForms = [
    {
        id: "form-esevai-income",
        title: "Income Certificate Application",
        description: "Apply for verified government Income Certificate under E-Sevai services.",
        category: "E sevai",
        fields: JSON.stringify(fieldsEsevai),
        fee: 60,
        instructions: "1. Family income must be less than 72,000 for urban and rural areas.\n2. Upload clear scanned copy of original Aadhaar card.\n3. Make sure active income certificate details match smart card entries.",
        required_fields: JSON.stringify(["name", "name_tamil", "dob", "phone", "aadhar", "gender", "marital_status", "father_name", "father_name_tamil", "mother_name", "mother_name_tamil", "community", "address"]),
        required_docs: JSON.stringify(["photo", "aadhar", "smart_card"]),
        custom_docs: JSON.stringify([]),
        created_at: new Date().toISOString()
    },
    {
        id: "form-pancard-new",
        title: "New PAN Card / Correction",
        description: "Official NSDL / UTITSL PAN card application service.",
        category: "pan card",
        fields: JSON.stringify(fieldsPancard),
        fee: 107,
        instructions: "1. Full name must match Aadhaar card spelling exactly.\n2. Ensure date of birth matches the uploaded age proof.\n3. Mobile number should be linked to Aadhaar for e-KYC verification.",
        required_fields: JSON.stringify(["name", "dob", "phone", "aadhar", "gender", "father_name", "address"]),
        required_docs: JSON.stringify(["photo", "aadhar"]),
        custom_docs: JSON.stringify([]),
        created_at: new Date().toISOString()
    },
    {
        id: "form-voter-new",
        title: "Voter ID Registration Form",
        description: "Register as a new voter or apply for changes in Assembly voting record.",
        category: "voter id",
        fields: JSON.stringify(fieldsVoter),
        fee: 50,
        instructions: "1. Minimum age criteria: Applicant must have completed 18 years.\n2. Address should be in current voting constituency bounds.\n3. Verify mother's and father's names matching family voter IDs.",
        required_fields: JSON.stringify(["name", "name_tamil", "dob", "phone", "aadhar", "gender", "father_name", "father_name_tamil", "mother_name", "mother_name_tamil", "address"]),
        required_docs: JSON.stringify(["photo", "aadhar", "voter_id"]),
        custom_docs: JSON.stringify([]),
        created_at: new Date().toISOString()
    }
];

function migrateAndSeedDB() {
    const db = readDB();
    let changed = false;

    // 1. Seed posts if empty
    if (!db.posts || db.posts.length === 0) {
        db.posts = defaultPosts;
        changed = true;
        console.log("Seeding default posts...");
    }

    // 2. Seed forms if empty
    if (!db.forms || db.forms.length === 0) {
        db.forms = defaultForms;
        changed = true;
        console.log("Seeding default forms...");
    } else {
        // Run migration logic over existing forms to verify schema completeness
        db.forms = db.forms.map(form => {
            let formChanged = false;
            if (form.fee === undefined) { form.fee = 50; formChanged = true; }
            if (form.instructions === undefined) { form.instructions = "Please fill in standard details and upload required documents."; formChanged = true; }
            if (form.required_fields === undefined) { form.required_fields = JSON.stringify(["name", "dob", "phone", "aadhar"]); formChanged = true; }
            if (form.required_docs === undefined) { form.required_docs = JSON.stringify(["photo", "aadhar"]); formChanged = true; }
            if (form.custom_docs === undefined) { form.custom_docs = JSON.stringify([]); formChanged = true; }

            // Apply specific defaults for standard forms
            if (form.id === "form-esevai-income" && form.fee === 50) {
                form.fee = 60;
                form.instructions = "1. Family income must be less than 72,000 for urban and rural areas.\n2. Upload clear scanned copy of original Aadhaar card.\n3. Make sure active income certificate details match smart card entries.";
                form.required_fields = JSON.stringify(["name", "name_tamil", "dob", "phone", "aadhar", "gender", "marital_status", "father_name", "father_name_tamil", "mother_name", "mother_name_tamil", "community", "address"]);
                form.required_docs = JSON.stringify(["photo", "aadhar", "smart_card"]);
                form.custom_docs = JSON.stringify([]);
                formChanged = true;
            }
            if (form.id === "form-pancard-new" && form.fee === 50) {
                form.fee = 107;
                form.instructions = "1. Full name must match Aadhaar card spelling exactly.\n2. Ensure date of birth matches the uploaded age proof.\n3. Mobile number should be linked to Aadhaar for e-KYC verification.";
                form.required_fields = JSON.stringify(["name", "dob", "phone", "aadhar", "gender", "father_name", "address"]);
                form.required_docs = JSON.stringify(["photo", "aadhar"]);
                form.custom_docs = JSON.stringify([]);
                formChanged = true;
            }
            if (form.id === "form-voter-new" && form.fee === 50) {
                form.fee = 50;
                form.instructions = "1. Minimum age criteria: Applicant must have completed 18 years.\n2. Address should be in current voting constituency bounds.\n3. Verify mother's and father's names matching family voter IDs.";
                form.required_fields = JSON.stringify(["name", "name_tamil", "dob", "phone", "aadhar", "gender", "father_name", "father_name_tamil", "mother_name", "mother_name_tamil", "address"]);
                form.required_docs = JSON.stringify(["photo", "aadhar", "voter_id"]);
                form.custom_docs = JSON.stringify([]);
                formChanged = true;
            }

            if (formChanged) changed = true;
            return form;
        });

        // Ensure all required default forms exist in DB
        const requiredFormIds = ["form-esevai-income", "form-pancard-new", "form-voter-new"];
        requiredFormIds.forEach(id => {
            const exists = db.forms.some(f => f.id === id);
            if (!exists) {
                const defForm = defaultForms.find(f => f.id === id);
                if (defForm) {
                    db.forms.push(defForm);
                    changed = true;
                    console.log(`Seeding missing default form ${id}...`);
                }
            }
        });
    }

    if (changed) {
        writeDB(db);
    }
}

// Run migrations on start
migrateAndSeedDB();


// ==========================================
// --- POSTS API ---
// ==========================================

app.get('/api/posts', (req, res) => {
    const db = readDB();
    // Sort descending by id
    const sortedPosts = [...db.posts].sort((a, b) => b.id - a.id);
    res.json(sortedPosts);
});

app.post('/api/posts', (req, res) => {
    const db = readDB();
    const newId = db.posts.length > 0 ? Math.max(...db.posts.map(p => p.id)) + 1 : 1;
    
    const newPost = {
        id: newId,
        title: req.body.title,
        description: req.body.description || null,
        img_url: req.body.img_url || "",
        apply_url: req.body.apply_url || "",
        created_at: new Date().toISOString()
    };
    
    db.posts.push(newPost);
    writeDB(db);
    res.json(newPost);
});

app.put('/api/posts/:post_id', (req, res) => {
    const post_id = parseInt(req.params.post_id);
    const db = readDB();
    const post = db.posts.find(p => p.id === post_id);
    if (!post) {
        return res.status(404).json({ detail: "Post not found" });
    }
    
    if (req.body.title !== undefined) post.title = req.body.title;
    if (req.body.description !== undefined) post.description = req.body.description;
    if (req.body.img_url !== undefined) post.img_url = req.body.img_url;
    if (req.body.apply_url !== undefined) post.apply_url = req.body.apply_url;
    
    writeDB(db);
    res.json(post);
});

app.delete('/api/posts/:post_id', (req, res) => {
    const post_id = parseInt(req.params.post_id);
    const db = readDB();
    const index = db.posts.findIndex(p => p.id === post_id);
    if (index === -1) {
        return res.status(404).json({ detail: "Post not found" });
    }
    
    db.posts.splice(index, 1);
    writeDB(db);
    res.json({ success: true, message: "Post deleted" });
});

app.post('/api/posts/upload-image', singleUpload, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ detail: "No file uploaded" });
    }
    
    const ext = path.extname(req.file.originalname).substring(1) || 'png';
    const filename = `post_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filepath = path.join(POSTS_IMAGES_DIR, filename);
    
    fs.writeFileSync(filepath, req.file.buffer);
    res.json({ img_url: `/uploads/posts/${filename}` });
});


// ==========================================
// --- FORMS API ---
// ==========================================

app.get('/api/forms', (req, res) => {
    const db = readDB();
    res.json(db.forms);
});

app.get('/api/forms/:form_id', (req, res) => {
    const form_id = req.params.form_id;
    const db = readDB();
    const form = db.forms.find(f => f.id === form_id);
    if (!form) {
        return res.status(404).json({ detail: "Form not found" });
    }
    res.json(form);
});

app.post('/api/forms', (req, res) => {
    const db = readDB();
    const form_id = req.body.id || `form-${crypto.randomBytes(4).toString('hex')}`;
    
    // Check duplicate
    const existing = db.forms.find(f => f.id === form_id);
    if (existing) {
        return res.status(400).json({ detail: "Form ID already exists" });
    }
    
    const newForm = {
        id: form_id,
        title: req.body.title,
        description: req.body.description || null,
        category: req.body.category,
        fields: req.body.fields,
        fee: req.body.fee !== undefined ? req.body.fee : 0,
        instructions: req.body.instructions || null,
        required_fields: req.body.required_fields || null,
        required_docs: req.body.required_docs || null,
        custom_docs: req.body.custom_docs || null,
        created_at: new Date().toISOString()
    };
    
    db.forms.push(newForm);
    writeDB(db);
    res.json(newForm);
});

app.put('/api/forms/:form_id', (req, res) => {
    const form_id = req.params.form_id;
    const db = readDB();
    const form = db.forms.find(f => f.id === form_id);
    if (!form) {
        return res.status(404).json({ detail: "Form not found" });
    }
    
    if (req.body.title !== undefined) form.title = req.body.title;
    if (req.body.description !== undefined) form.description = req.body.description;
    if (req.body.category !== undefined) form.category = req.body.category;
    if (req.body.fields !== undefined) form.fields = req.body.fields;
    if (req.body.fee !== undefined) form.fee = req.body.fee;
    if (req.body.instructions !== undefined) form.instructions = req.body.instructions;
    if (req.body.required_fields !== undefined) form.required_fields = req.body.required_fields;
    if (req.body.required_docs !== undefined) form.required_docs = req.body.required_docs;
    if (req.body.custom_docs !== undefined) form.custom_docs = req.body.custom_docs;
    
    writeDB(db);
    res.json(form);
});

app.delete('/api/forms/:form_id', (req, res) => {
    const form_id = req.params.form_id;
    const db = readDB();
    const index = db.forms.findIndex(f => f.id === form_id);
    if (index === -1) {
        return res.status(404).json({ detail: "Form not found" });
    }
    
    db.forms.splice(index, 1);
    // Delete submissions for this form
    db.submissions = db.submissions.filter(s => s.form_id !== form_id);
    
    writeDB(db);
    res.json({ success: true, message: "Form and associated submissions deleted" });
});


// ==========================================
// --- USER PROFILE APIS ---
// ==========================================

app.post('/api/users/register', (req, res) => {
    const db = readDB();
    const phone_clean = (req.body.phone || '').trim();
    const dob_clean = (req.body.dob || '').trim();
    const aadhar_clean = req.body.aadhar ? req.body.aadhar.trim() : null;
    
    // Check unique constraints
    const existingPhone = db.users.find(u => u.phone === phone_clean && u.dob === dob_clean);
    if (existingPhone) {
        return res.status(400).json({ detail: "A user with this Phone number and DOB is already registered." });
    }
    
    if (aadhar_clean) {
        const existingAadhar = db.users.find(u => u.aadhar === aadhar_clean && u.dob === dob_clean);
        if (existingAadhar) {
            return res.status(400).json({ detail: "A user with this Aadhaar number and DOB is already registered." });
        }
    }
    
    const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
    const newUser = {
        id: newId,
        name: req.body.name,
        name_tamil: req.body.name_tamil || null,
        dob: dob_clean,
        phone: phone_clean,
        aadhar: aadhar_clean,
        gender: req.body.gender || null,
        marital_status: req.body.marital_status || null,
        father_name: req.body.father_name || null,
        father_name_tamil: req.body.father_name_tamil || null,
        mother_name: req.body.mother_name || null,
        mother_name_tamil: req.body.mother_name_tamil || null,
        community: req.body.community || null,
        address: req.body.address || null,
        
        religion: req.body.religion || null,
        state: req.body.state || null,
        district: req.body.district || null,
        taluk: req.body.taluk || null,
        revenue_village: req.body.revenue_village || null,
        street_name: req.body.street_name || null,
        door_no: req.body.door_no || null,
        pincode: req.body.pincode || null,
        
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
    
    db.users.push(newUser);
    writeDB(db);
    res.json(newUser);
});

app.post('/api/users/login', (req, res) => {
    const db = readDB();
    const dob_clean = (req.body.dob || '').trim();
    const phone = req.body.phone ? req.body.phone.trim() : '';
    const aadhar = req.body.aadhar ? req.body.aadhar.trim() : '';
    
    let user = null;
    if (phone) {
        user = db.users.find(u => u.dob === dob_clean && u.phone === phone);
    } else if (aadhar) {
        user = db.users.find(u => u.dob === dob_clean && u.aadhar === aadhar);
    } else {
        return res.status(400).json({ detail: "Please provide either a Phone number or Aadhaar number for verification." });
    }
    
    if (!user) {
        return res.status(404).json({ detail: "Invalid credentials. No user profile found with this DOB and Phone/Aadhaar." });
    }
    res.json(user);
});

app.put('/api/users/:user_id', (req, res) => {
    const user_id = parseInt(req.params.user_id);
    const db = readDB();
    const user = db.users.find(u => u.id === user_id);
    if (!user) {
        return res.status(404).json({ detail: "User profile not found" });
    }
    
    const fields = [
        'name', 'name_tamil', 'dob', 'phone', 'aadhar', 'gender', 'marital_status',
        'father_name', 'father_name_tamil', 'mother_name', 'mother_name_tamil',
        'community', 'address', 'photo_url', 'aadhar_url_1', 'aadhar_url_2',
        'smart_card_url_1', 'smart_card_url_2', 'voter_id_url_1', 'voter_id_url_2',
        'religion', 'state', 'district', 'taluk', 'revenue_village', 'street_name',
        'door_no', 'pincode', 'signature_url_1'
    ];
    
    fields.forEach(field => {
        if (req.body[field] !== undefined) {
            user[field] = req.body[field];
        }
    });
    
    writeDB(db);
    res.json(user);
});

app.post('/api/users/:user_id/upload-doc/:doc_type', multiUpload, (req, res) => {
    const userId = parseInt(req.params.user_id);
    const docType = req.params.doc_type;
    const db = readDB();
    
    const user = db.users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ detail: "User profile not found" });
    }
    
    const validDocTypes = ["photo", "aadhar", "smart_card", "voter_id", "signature"];
    if (!validDocTypes.includes(docType)) {
        return res.status(400).json({ detail: "Invalid document type" });
    }
    
    const file1 = req.files && req.files['file1'] ? req.files['file1'][0] : null;
    const file2 = req.files && req.files['file2'] ? req.files['file2'][0] : null;
    
    if (!file1) {
        return res.status(400).json({ detail: "Primary file is required" });
    }
    
    // File limits check
    const max_size = docType === "photo" ? 7 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file1.size > max_size) {
        return res.status(400).json({ detail: `File exceeds the allowed size limit of ${max_size / (1024 * 1024)}MB.` });
    }
    if (file2 && file2.size > max_size) {
        return res.status(400).json({ detail: `Secondary file exceeds the allowed size limit of ${max_size / (1024 * 1024)}MB.` });
    }
    
    // Delete old physical files if they exist to keep server clean and replace them
    let oldUrls = [];
    if (docType === "photo" && user.photo_url) {
        oldUrls.push(user.photo_url);
    } else if (docType === "aadhar") {
        if (user.aadhar_url_1) oldUrls.push(user.aadhar_url_1);
        if (user.aadhar_url_2) oldUrls.push(user.aadhar_url_2);
    } else if (docType === "smart_card") {
        if (user.smart_card_url_1) oldUrls.push(user.smart_card_url_1);
        if (user.smart_card_url_2) oldUrls.push(user.smart_card_url_2);
    } else if (docType === "voter_id") {
        if (user.voter_id_url_1) oldUrls.push(user.voter_id_url_1);
        if (user.voter_id_url_2) oldUrls.push(user.voter_id_url_2);
    } else if (docType === "signature" && user.signature_url_1) {
        oldUrls.push(user.signature_url_1);
    }
    oldUrls.forEach(url => deletePhysicalFile(url));

    // Save file 1
    const ext1 = path.extname(file1.originalname).substring(1) || 'png';
    const filename1 = `user_${userId}_${docType}_1.${ext1}`;
    const filepath1 = path.join(DOCUMENTS_DIR, filename1);
    fs.writeFileSync(filepath1, file1.buffer);
    const url1 = `/uploads/documents/${filename1}`;
    
    let url2 = null;
    if (file2) {
        const ext2 = path.extname(file2.originalname).substring(1) || 'png';
        const filename2 = `user_${userId}_${docType}_2.${ext2}`;
        const filepath2 = path.join(DOCUMENTS_DIR, filename2);
        fs.writeFileSync(filepath2, file2.buffer);
        url2 = `/uploads/documents/${filename2}`;
    }
    
    // Update DB
    if (docType === "photo") {
        user.photo_url = url1;
    } else if (docType === "aadhar") {
        user.aadhar_url_1 = url1;
        user.aadhar_url_2 = url2;
    } else if (docType === "smart_card") {
        user.smart_card_url_1 = url1;
        user.smart_card_url_2 = url2;
    } else if (docType === "voter_id") {
        user.voter_id_url_1 = url1;
        user.voter_id_url_2 = url2;
    } else if (docType === "signature") {
        user.signature_url_1 = url1;
    }
    
    writeDB(db);
    
    res.json({
        success: true,
        doc_type: docType,
        url_1: url1,
        url_2: url2
    });
});

app.delete('/api/users/:user_id/document/:doc_type', (req, res) => {
    const userId = parseInt(req.params.user_id);
    const docType = req.params.doc_type;
    const db = readDB();
    
    const user = db.users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ detail: "User profile not found" });
    }
    
    const validDocTypes = ["photo", "aadhar", "smart_card", "voter_id", "signature"];
    if (!validDocTypes.includes(docType)) {
        return res.status(400).json({ detail: "Invalid document type" });
    }
    
    // 1. Delete physical files from disk
    let oldUrls = [];
    if (docType === "photo" && user.photo_url) {
        oldUrls.push(user.photo_url);
    } else if (docType === "aadhar") {
        if (user.aadhar_url_1) oldUrls.push(user.aadhar_url_1);
        if (user.aadhar_url_2) oldUrls.push(user.aadhar_url_2);
    } else if (docType === "smart_card") {
        if (user.smart_card_url_1) oldUrls.push(user.smart_card_url_1);
        if (user.smart_card_url_2) oldUrls.push(user.smart_card_url_2);
    } else if (docType === "voter_id") {
        if (user.voter_id_url_1) oldUrls.push(user.voter_id_url_1);
        if (user.voter_id_url_2) oldUrls.push(user.voter_id_url_2);
    } else if (docType === "signature" && user.signature_url_1) {
        oldUrls.push(user.signature_url_1);
    }
    
    oldUrls.forEach(url => deletePhysicalFile(url));
    
    // 2. Set database URLs to null
    if (docType === "photo") {
        user.photo_url = null;
    } else if (docType === "aadhar") {
        user.aadhar_url_1 = null;
        user.aadhar_url_2 = null;
    } else if (docType === "smart_card") {
        user.smart_card_url_1 = null;
        user.smart_card_url_2 = null;
    } else if (docType === "voter_id") {
        user.voter_id_url_1 = null;
        user.voter_id_url_2 = null;
    } else if (docType === "signature") {
        user.signature_url_1 = null;
    }
    
    writeDB(db);
    res.json(user);
});


// ==========================================
// --- SUBMISSIONS & USER APIS ---
// ==========================================

// Submit Form response
app.post('/api/submissions', (req, res) => {
    const db = readDB();
    const sub_id = generateId('sub-');
    
    const newSubmission = {
        id: sub_id,
        form_id: req.body.form_id || null,
        phone: (req.body.phone || '').trim(),
        dob: (req.body.dob || '').trim(),
        aadhar: (req.body.aadhar || '').trim(),
        responses: req.body.responses,
        uploaded_docs: req.body.uploaded_docs || null,
        payment_status: "unpaid",
        payment_screenshot: null,
        progress_percent: 10,
        progress_desc: "Application submitted successfully. Awaiting payment verification.",
        uploaded_pdf_url: null,
        submitted_at: new Date().toISOString()
    };
    
    db.submissions.push(newSubmission);
    writeDB(db);
    res.json(newSubmission);
});

// Submission specific document upload
app.post('/api/submissions/:sub_id/upload-doc/:doc_key', multiUpload, (req, res) => {
    const sub_id = req.params.sub_id;
    const doc_key = req.params.doc_key;
    const db = readDB();
    
    const sub = db.submissions.find(s => s.id === sub_id);
    if (!sub) {
        return res.status(404).json({ detail: "Submission not found" });
    }
    
    const file1 = req.files && req.files['file1'] ? req.files['file1'][0] : null;
    const file2 = req.files && req.files['file2'] ? req.files['file2'][0] : null;
    
    if (!file1) {
        return res.status(400).json({ detail: "Primary file is required" });
    }
    
    const max_size = doc_key === "photo" ? 7 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file1.size > max_size) {
        return res.status(400).json({ detail: `File '${doc_key}' exceeds the size limit of ${max_size / (1024 * 1024)}MB.` });
    }
    if (file2 && file2.size > max_size) {
        return res.status(400).json({ detail: `Secondary file for '${doc_key}' exceeds the size limit of ${max_size / (1024 * 1024)}MB.` });
    }
    
    // Save file 1
    const ext1 = path.extname(file1.originalname).substring(1) || 'png';
    const filename1 = `sub_${sub_id}_${doc_key}_1.${ext1}`;
    const filepath1 = path.join(DOCUMENTS_DIR, filename1);
    fs.writeFileSync(filepath1, file1.buffer);
    const url1 = `/uploads/documents/${filename1}`;
    
    let url2 = null;
    if (file2) {
        const ext2 = path.extname(file2.originalname).substring(1) || 'png';
        const filename2 = `sub_${sub_id}_${doc_key}_2.${ext2}`;
        const filepath2 = path.join(DOCUMENTS_DIR, filename2);
        fs.writeFileSync(filepath2, file2.buffer);
        url2 = `/uploads/documents/${filename2}`;
    }
    
    // Load existing uploaded docs
    let current_docs = {};
    if (sub.uploaded_docs) {
        try {
            current_docs = typeof sub.uploaded_docs === 'string' ? JSON.parse(sub.uploaded_docs) : sub.uploaded_docs;
        } catch (e) {
            current_docs = {};
        }
    }
    
    if (url2) {
        current_docs[doc_key] = [url1, url2];
    } else {
        current_docs[doc_key] = [url1];
    }
    
    sub.uploaded_docs = JSON.stringify(current_docs);
    writeDB(db);
    
    res.json({
        success: true,
        doc_key: doc_key,
        urls: current_docs[doc_key]
    });
});

// User Lookup Status (Refined to support Aadhaar)
app.get('/api/submissions/user-status', (req, res) => {
    const dob = req.query.dob;
    const phone = req.query.phone;
    const aadhar = req.query.aadhar;
    
    if (!dob) {
        return res.status(400).json({ detail: "Date of Birth is required" });
    }
    
    const dob_clean = dob.trim();
    const db = readDB();
    
    let filtered = db.submissions.filter(s => s.dob === dob_clean);
    
    const phone_clean = phone ? phone.trim() : '';
    const aadhar_clean = aadhar ? aadhar.trim() : '';
    
    if (phone_clean) {
        filtered = filtered.filter(s => s.phone === phone_clean);
    } else if (aadhar_clean) {
        filtered = filtered.filter(s => s.aadhar === aadhar_clean);
    } else {
        return res.status(400).json({ detail: "Must provide either Phone number or Aadhaar number to verify status." });
    }
    
    // Sort descending by submitted_at
    filtered.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    res.json(filtered);
});

// User Payment Receipt Screenshot Upload
app.post('/api/submissions/:sub_id/upload-screenshot', singleUpload, (req, res) => {
    const sub_id = req.params.sub_id;
    if (!req.file) {
        return res.status(400).json({ detail: "No screenshot file uploaded" });
    }
    
    const db = readDB();
    const sub = db.submissions.find(s => s.id === sub_id);
    if (!sub) {
        return res.status(404).json({ detail: "Submission not found" });
    }
    
    const ext = path.extname(req.file.originalname).substring(1) || 'png';
    const filename = `screenshot_${sub_id}.${ext}`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    
    fs.writeFileSync(filepath, req.file.buffer);
    
    sub.payment_screenshot = `/uploads/screenshots/${filename}`;
    sub.progress_percent = 25;
    sub.progress_desc = "Payment receipt uploaded. Admin is verifying your payment details.";
    
    writeDB(db);
    res.json(sub);
});

// Admin PDF document Upload (Legacy - kept for compatibility, progress auto-advance removed)
app.post('/api/submissions/:sub_id/upload-pdf', singleUpload, (req, res) => {
    const sub_id = req.params.sub_id;
    if (!req.file) {
        return res.status(400).json({ detail: "No PDF file uploaded" });
    }
    
    const db = readDB();
    const sub = db.submissions.find(s => s.id === sub_id);
    if (!sub) {
        return res.status(404).json({ detail: "Submission not found" });
    }
    
    const ext = path.extname(req.file.originalname).substring(1) || 'pdf';
    const filename = `document_${sub_id}.${ext}`;
    const filepath = path.join(PDFS_DIR, filename);
    
    fs.writeFileSync(filepath, req.file.buffer);
    
    sub.uploaded_pdf_url = `/uploads/pdfs/${filename}`;
    // progress auto-advance removed per user request
    
    writeDB(db);
    res.json(sub);
});

// Admin specific document type upload (receipt / certificate / other)
app.post('/api/submissions/:sub_id/upload-doc-admin/:doc_type', singleUpload, (req, res) => {
    const sub_id = req.params.sub_id;
    const doc_type = req.params.doc_type; // 'receipt' | 'certificate' | 'other'
    
    if (!req.file) {
        return res.status(400).json({ detail: "No file uploaded" });
    }
    
    const db = readDB();
    const sub = db.submissions.find(s => s.id === sub_id);
    if (!sub) {
        return res.status(404).json({ detail: "Submission not found" });
    }
    
    const ext = path.extname(req.file.originalname).substring(1) || 'png';
    const filename = `admin_${doc_type}_${sub_id}_${crypto.randomBytes(2).toString('hex')}.${ext}`;
    const filepath = path.join(PDFS_DIR, filename);
    
    fs.writeFileSync(filepath, req.file.buffer);
    const fileUrl = `/uploads/pdfs/${filename}`;
    
    if (doc_type === 'receipt') {
        if (sub.receipt_url) deletePhysicalFile(sub.receipt_url);
        sub.receipt_url = fileUrl;
    } else if (doc_type === 'certificate') {
        if (sub.certificate_url) deletePhysicalFile(sub.certificate_url);
        sub.certificate_url = fileUrl;
    } else if (doc_type === 'other') {
        if (sub.other_doc_url) deletePhysicalFile(sub.other_doc_url);
        sub.other_doc_url = fileUrl;
    } else {
        return res.status(400).json({ detail: "Invalid document type" });
    }
    
    writeDB(db);
    res.json(sub);
});

// Admin delete specific document
app.delete('/api/submissions/:sub_id/delete-doc-admin/:doc_type', (req, res) => {
    const sub_id = req.params.sub_id;
    const doc_type = req.params.doc_type;
    
    const db = readDB();
    const sub = db.submissions.find(s => s.id === sub_id);
    if (!sub) {
        return res.status(404).json({ detail: "Submission not found" });
    }
    
    let oldUrl = null;
    if (doc_type === 'receipt') {
        oldUrl = sub.receipt_url;
        sub.receipt_url = null;
    } else if (doc_type === 'certificate') {
        oldUrl = sub.certificate_url;
        sub.certificate_url = null;
    } else if (doc_type === 'other') {
        oldUrl = sub.other_doc_url;
        sub.other_doc_url = null;
    } else {
        return res.status(400).json({ detail: "Invalid document type" });
    }
    
    if (oldUrl) {
        deletePhysicalFile(oldUrl);
    }
    
    writeDB(db);
    res.json(sub);
});

// Get list of unique users for Admin
app.get('/api/submissions/users', (req, res) => {
    const db = readDB();
    
    // Sort submissions descending by submitted_at
    const sortedSubs = [...db.submissions].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    
    const seenAadhar = new Set();
    const uniqueUsers = [];
    
    for (const sub of sortedSubs) {
        if (sub.aadhar && !seenAadhar.has(sub.aadhar)) {
            seenAadhar.add(sub.aadhar);
            const userProfile = db.users.find(u => u.aadhar === sub.aadhar) || {};
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
    
    res.json(uniqueUsers);
});

// Get all submissions for a specific Aadhaar
app.get('/api/submissions/by-user/:aadhar', (req, res) => {
    const aadhar = req.params.aadhar.trim();
    const db = readDB();
    
    const subs = db.submissions
        .filter(s => s.aadhar === aadhar)
        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
        
    res.json(subs);
});

// Admin update submission detail
app.put('/api/submissions/:sub_id', (req, res) => {
    const sub_id = req.params.sub_id;
    const db = readDB();
    
    const sub = db.submissions.find(s => s.id === sub_id);
    if (!sub) {
        return res.status(404).json({ detail: "Submission not found" });
    }
    
    if (req.body.responses !== undefined) sub.responses = req.body.responses;
    if (req.body.uploaded_docs !== undefined) sub.uploaded_docs = req.body.uploaded_docs;
    if (req.body.payment_status !== undefined) sub.payment_status = req.body.payment_status;
    if (req.body.progress_percent !== undefined) sub.progress_percent = req.body.progress_percent;
    if (req.body.progress_desc !== undefined) sub.progress_desc = req.body.progress_desc;
    if (req.body.uploaded_pdf_url !== undefined) sub.uploaded_pdf_url = req.body.uploaded_pdf_url;
    if (req.body.receipt_url !== undefined) sub.receipt_url = req.body.receipt_url;
    if (req.body.certificate_url !== undefined) sub.certificate_url = req.body.certificate_url;
    if (req.body.other_doc_url !== undefined) sub.other_doc_url = req.body.other_doc_url;
    if (req.body.other_doc_name !== undefined) sub.other_doc_name = req.body.other_doc_name;
    
    // Info request fields
    if (req.body.info_request_label !== undefined) sub.info_request_label = req.body.info_request_label;
    if (req.body.info_request_type !== undefined) sub.info_request_type = req.body.info_request_type;
    if (req.body.info_request_response !== undefined) sub.info_request_response = req.body.info_request_response;
    
    // Auto-advance if payment is marked as paid
    if (req.body.payment_status === "paid" && sub.progress_percent < 50) {
        sub.progress_percent = 50;
        sub.progress_desc = "Payment verified. Admin is processing your application documents.";
    }
    
    writeDB(db);
    res.json(sub);
});

// User respond to requested info
app.post('/api/submissions/:sub_id/respond-info', singleUpload, (req, res) => {
    const sub_id = req.params.sub_id;
    const db = readDB();
    const sub = db.submissions.find(s => s.id === sub_id);
    if (!sub) {
        return res.status(404).json({ detail: "Submission not found" });
    }
    
    if (req.file) {
        const ext = path.extname(req.file.originalname).substring(1) || 'png';
        const filename = `requested_info_${sub_id}_${crypto.randomBytes(2).toString('hex')}.${ext}`;
        const filepath = path.join(DOCUMENTS_DIR, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        sub.info_request_response = `/uploads/documents/${filename}`;
    } else {
        sub.info_request_response = req.body.response || '';
    }
    
    writeDB(db);
    res.json(sub);
});

// Delete single submission
app.delete('/api/submissions/:sub_id', (req, res) => {
    const sub_id = req.params.sub_id;
    const db = readDB();
    
    const index = db.submissions.findIndex(s => s.id === sub_id);
    if (index === -1) {
        return res.status(404).json({ detail: "Submission not found" });
    }
    
    const sub = db.submissions[index];
    
    // Delete files
    if (sub.payment_screenshot) deletePhysicalFile(sub.payment_screenshot);
    if (sub.uploaded_pdf_url) deletePhysicalFile(sub.uploaded_pdf_url);
    if (sub.receipt_url) deletePhysicalFile(sub.receipt_url);
    if (sub.certificate_url) deletePhysicalFile(sub.certificate_url);
    if (sub.other_doc_url) deletePhysicalFile(sub.other_doc_url);
    
    db.submissions.splice(index, 1);
    writeDB(db);
    res.json({ success: true, message: "Submission deleted successfully" });
});

// Delete user and all their applications
app.delete('/api/submissions/users/:aadhar', (req, res) => {
    const aadhar = req.params.aadhar;
    const db = readDB();
    
    const subsToDelete = db.submissions.filter(s => s.aadhar === aadhar);
    
    for (const sub of subsToDelete) {
        if (sub.payment_screenshot) deletePhysicalFile(sub.payment_screenshot);
        if (sub.uploaded_pdf_url) deletePhysicalFile(sub.uploaded_pdf_url);
        if (sub.receipt_url) deletePhysicalFile(sub.receipt_url);
        if (sub.certificate_url) deletePhysicalFile(sub.certificate_url);
        if (sub.other_doc_url) deletePhysicalFile(sub.other_doc_url);
    }
    
    db.submissions = db.submissions.filter(s => s.aadhar !== aadhar);
    db.users = db.users.filter(u => u.aadhar !== aadhar);
    
    writeDB(db);
    res.json({ success: true, message: `User with Aadhaar ${aadhar} and all applications deleted.` });
});


// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==========================================`);
    console.log(`Express Server started on http://0.0.0.0:${PORT}`);
    console.log(`Serving uploads from static path /uploads`);
    console.log(`Database located at ${DB_PATH}`);
    console.log(`==========================================`);
});
