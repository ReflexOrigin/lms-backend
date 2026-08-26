const fs = require('fs');

const STRAPI_URL = 'http://localhost:1337';

const users = [
  { username: 'admin_sarah', email: 'sarah@lms.com', password: 'Password123!', role: 'admin_role' },
  { username: 'cm_rafiq', email: 'rafiq@lms.com', password: 'Password123!', role: 'content_manager' },
  { username: 'cm_nadia', email: 'nadia@lms.com', password: 'Password123!', role: 'content_manager' },
  { username: 'inst_aisha', email: 'aisha@lms.com', password: 'Password123!', role: 'instructor' },
  { username: 'inst_imran', email: 'imran@lms.com', password: 'Password123!', role: 'instructor' },
  { username: 'student_karim', email: 'karim@lms.com', password: 'Password123!', role: 'authenticated' },
  { username: 'student_fatima', email: 'fatima@lms.com', password: 'Password123!', role: 'authenticated' },
];

const categories = [
  { name: 'Data Science', description: 'AI, Machine Learning, and Data Analytics' },
  { name: 'Programming', description: 'Software engineering and coding' },
  { name: 'Cloud Computing', description: 'AWS, Azure, and infrastructure' },
  { name: 'Cybersecurity', description: 'Network security and ethical hacking' }
];

async function fetchApi(path, options = {}) {
  const res = await fetch(`${STRAPI_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status} on ${path}: ${err}`);
  }
  return res.json();
}

async function seed() {
  console.log('--- Starting Seed Process ---');

  // 1. Get Admin JWT
  console.log('\\n[1] Getting SuperAdmin JWT...');
  let adminJwt;
  try {
    const adminRes = await fetchApi('/api/auth/local', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'admin@lms.com', password: 'AdminPassword123!' })
    });
    adminJwt = adminRes.jwt;
    console.log('✅ Got SuperAdmin JWT');
  } catch (e) {
    console.error('❌ Failed to login as SuperAdmin (did you run setup?). Run npm run build & npm run develop first.');
    return;
  }

  // 2. Create Users
  console.log('\\n[2] Creating Test Users...');
  const userJwts = {};
  const userIds = {};
  
  // Register all users first (as allowed roles)
  for (const u of users) {
    try {
      const requestedRole = ['instructor', 'authenticated'].includes(u.role) ? u.role : 'authenticated';
      const res = await fetchApi(`/api/auth/local/register?requestedRole=${requestedRole}`, {
        method: 'POST',
        body: JSON.stringify({ username: u.username, email: u.email, password: u.password })
      });
      userJwts[u.username] = res.jwt;
      userIds[u.username] = res.user.id;
      console.log(`✅ Registered ${u.username}`);
    } catch (e) {
      if (e.message.includes('Email or Username are already taken')) {
        console.log(`⚠️ User ${u.username} already exists. Attempting login...`);
        const loginRes = await fetchApi('/api/auth/local', {
          method: 'POST',
          body: JSON.stringify({ identifier: u.email, password: u.password })
        });
        userJwts[u.username] = loginRes.jwt;
        userIds[u.username] = loginRes.user.id;
      } else {
        console.error(`❌ Failed to register ${u.username}:`, e.message);
      }
    }
  }

  // Upgrade roles for admins/CMs
  console.log('\\n[2b] Upgrading Roles for Admins & CMs...');
  const usersList = await fetchApi('/api/admin-custom/users', { headers: { Authorization: `Bearer ${adminJwt}` } });
  
  // Get role IDs
  const rolesRes = await fetchApi('/api/users-permissions/roles', { headers: { Authorization: `Bearer ${adminJwt}` } });
  // Strapi v5 plugin endpoints sometimes have different response formats, but let's assume it returns { roles: [...] }
  const roles = rolesRes.roles || rolesRes; 
  const roleMap = roles.reduce((acc, r) => ({ ...acc, [r.type]: r.id }), {});

  for (const u of users) {
    if (u.role === 'admin_role' || u.role === 'content_manager') {
      const targetUser = usersList.data.find(x => x.username === u.username);
      if (targetUser && roleMap[u.role]) {
        try {
          await fetchApi(`/api/admin-custom/users/${targetUser.documentId}/role`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${adminJwt}` },
            body: JSON.stringify({ data: { roleId: roleMap[u.role] } })
          });
          console.log(`✅ Upgraded ${u.username} to ${u.role}`);
        } catch(e) {
          console.error(`❌ Failed to upgrade ${u.username}:`, e.message);
        }
      }
    }
  }

  // 3. Create Categories
  console.log('\\n[3] Creating Categories...');
  const categoryIds = {};
  for (const cat of categories) {
    try {
      const res = await fetchApi('/api/categories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminJwt}` },
        body: JSON.stringify({ data: cat })
      });
      categoryIds[cat.name] = res.data.documentId || res.data.id;
      console.log(`✅ Created Category: ${cat.name}`);
    } catch (e) {
      console.error(`⚠️ Failed to create category ${cat.name}:`, e.message);
    }
  }

  // 4. Create Courses & Lessons
  console.log('\\n[4] Creating Courses & Lessons...');
  const courses = [
    { title: 'Introduction to Machine Learning', desc: 'Supervised learning basics', cat: 'Data Science', instructor: 'inst_aisha' },
    { title: 'Advanced Data Analytics', desc: 'Data pipelines & visualization', cat: 'Data Science', instructor: 'inst_aisha' },
    { title: 'Python for Beginners', desc: 'Zero to Python hero', cat: 'Programming', instructor: 'inst_imran' },
    { title: 'Cloud Computing Essentials', desc: 'AWS, GCP & Azure fundamentals', cat: 'Cloud Computing', instructor: 'inst_imran' },
    { title: 'Web Development Bootcamp', desc: 'HTML/CSS/JS full stack', cat: 'Programming', instructor: 'inst_aisha' },
    { title: 'Cybersecurity Fundamentals', desc: 'Network security & ethical hacking', cat: 'Cybersecurity', instructor: 'inst_imran' }
  ];

  const courseIds = {};
  const lessonIds = {};

  for (const c of courses) {
    try {
      const jwt = userJwts[c.instructor];
      const res = await fetchApi('/api/courses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          data: {
            title: c.title,
            description: c.desc,
            category: categoryIds[c.cat],
            // Instructor policy automatically assigns instructor to the user token
          }
        })
      });
      const cid = res.data.documentId || res.data.id;
      courseIds[c.title] = cid;
      
      // Publish it
      await fetchApi(`/api/courses/${cid}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ data: { publishedAt: new Date().toISOString() } })
      });
      console.log(`✅ Created & Published Course: ${c.title}`);

      // Create lessons for it
      const numLessons = 4;
      for (let i = 1; i <= numLessons; i++) {
        const lRes = await fetchApi('/api/lessons', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({
            data: {
              title: `Lesson ${i} for ${c.title}`,
              content: `This is the content for lesson ${i}.`,
              order: i,
              course: cid
            }
          })
        });
        if (!lessonIds[c.title]) lessonIds[c.title] = [];
        lessonIds[c.title].push(lRes.data.documentId || lRes.data.id);
      }
      console.log(`✅ Created ${numLessons} lessons for ${c.title}`);
    } catch(e) {
      console.error(`❌ Failed course creation for ${c.title}:`, e.message);
    }
  }

  // 5. Create Quizzes
  console.log('\\n[5] Creating Quizzes...');
  const quizIds = {};
  for (const c of courses) {
    try {
      const jwt = userJwts[c.instructor];
      const cid = courseIds[c.title];
      
      const qRes = await fetchApi('/api/quizzes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          data: {
            title: `Final Assessment: ${c.title}`,
            course: cid
          }
        })
      });
      const qid = qRes.data.documentId || qRes.data.id;
      quizIds[c.title] = qid;
      
      // Questions
      for(let i=0; i<3; i++) {
        await fetchApi('/api/questions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({
            data: {
              text: `Sample question ${i+1} for ${c.title}?`,
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 0,
              quiz: qid
            }
          })
        });
      }
      console.log(`✅ Created Quiz for ${c.title}`);
    } catch (e) {
      console.error(`❌ Failed quiz creation for ${c.title}:`, e.message);
    }
  }

  // 6. Enrollments & Progress
  console.log('\\n[6] Creating Enrollments & Progress...');
  const enrollments = [
    { student: 'student_karim', courses: courses.map(c => c.title) },
    { student: 'student_fatima', courses: ['Introduction to Machine Learning', 'Python for Beginners'] }
  ];

  for (const en of enrollments) {
    const jwt = userJwts[en.student];
    for (const cTitle of en.courses) {
      try {
        const cid = courseIds[cTitle];
        
        await fetchApi('/api/enrollments', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({
            data: { course: cid }
          })
        });

        // Add some progress
        const lessons = lessonIds[cTitle] || [];
        for (let i = 0; i < lessons.length - 1; i++) {
          await fetchApi('/api/progresses', {
            method: 'POST',
            headers: { Authorization: `Bearer ${jwt}` },
            body: JSON.stringify({
              data: {
                course: cid,
                lesson: lessons[i],
                completed: true,
                completedAt: new Date().toISOString()
              }
            })
          });
        }
        
        // Add quiz attempt
        const quizId = quizIds[cTitle];
        const qRes = await fetchApi(`/api/quizzes/${quizId}?populate=questions`, {
          headers: { Authorization: `Bearer ${adminJwt}` }
        });
        const questions = qRes.data?.questions || [];
        const answers = {};
        questions.forEach((q, idx) => {
          answers[q.documentId] = idx % 2 === 0 ? 0 : 1; // dummy answers
        });

        await fetchApi('/api/quiz-attempts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({
            data: {
              quiz: quizId,
              answers: answers
            }
          })
        });
        
        console.log(`✅ Enrolled ${en.student} in ${cTitle} + Progress/Quiz`);
      } catch (e) {
        console.error(`❌ Failed enrollment for ${en.student} in ${cTitle}:`, e.message);
      }
    }
  }

  // 7. Blog Posts
  console.log('\\n[7] Creating Blog Posts...');
  const blogs = [
    { title: 'Getting Started with Machine Learning in 2026', author: 'cm_rafiq', cat: 'Data Science' },
    { title: '5 Python Libraries Every Data Scientist Should Know', author: 'cm_nadia', cat: 'Programming' },
    { title: 'The Future of Cloud Computing', author: 'cm_rafiq', cat: 'Cloud Computing' },
  ];

  for (const b of blogs) {
    try {
      const jwt = userJwts[b.author];
      const res = await fetchApi('/api/blog-posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          data: {
            title: b.title,
            body: `This is a great blog post about ${b.title}.`,
            category: categoryIds[b.cat]
          }
        })
      });
      const bid = res.data.documentId || res.data.id;
      
      await fetchApi(`/api/blog-posts/${bid}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ data: { publishedAt: new Date().toISOString() } })
      });
      console.log(`✅ Created & Published Blog: ${b.title}`);
    } catch(e) {
      console.error(`❌ Failed blog creation for ${b.title}:`, e.message);
    }
  }

  console.log('\\n--- Seed Process Completed ---');
  console.log('You can now log in with any of the accounts using password: Password123!');
}

seed().catch(console.error);
