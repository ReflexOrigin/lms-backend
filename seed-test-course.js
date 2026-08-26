const STRAPI_URL = 'http://localhost:1337';

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

async function seedTestCourse() {
  console.log('--- Starting Test Course Seeding ---');

  // 1. Authenticate as Instructor (Aisha)
  console.log('\n[1] Authenticating as Instructor Aisha...');
  let jwt;
  try {
    const authRes = await fetchApi('/api/auth/local', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'aisha@lms.com', password: 'Password123!' })
    });
    jwt = authRes.jwt;
    console.log('✅ Authenticated successfully');
  } catch (e) {
    console.error('❌ Failed to authenticate:', e.message);
    return;
  }

  // 2. Get Categories
  console.log('\n[2] Fetching Categories...');
  let categoryId;
  try {
    const catRes = await fetchApi('/api/categories');
    const programmingCat = catRes.data.find(c => c.name === 'Programming');
    if (!programmingCat) {
      // Create if missing
      const newCatRes = await fetchApi('/api/categories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ data: { name: 'Programming', description: 'Coding' } })
      });
      categoryId = newCatRes.data.documentId;
    } else {
      categoryId = programmingCat.documentId;
    }
    console.log('✅ Found Category ID:', categoryId);
  } catch (e) {
    console.error('❌ Failed to fetch/create category:', e.message);
    return;
  }

  // 3. Create Course
  console.log('\n[3] Creating Course...');
  let courseId;
  const courseData = {
    title: 'Next.js 14 App Router Fundamentals',
    description: 'A complete guide to modern web development using Next.js 14, covering Server Components, Data Fetching, and Advanced Routing.',
    slug: 'nextjs-14-app-router-fundamentals',
    category: categoryId
  };

  try {
    const courseRes = await fetchApi('/api/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ data: courseData })
    });
    courseId = courseRes.data.documentId;
    
    // Publish Course
    await fetchApi(`/api/courses/${courseId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ data: { publishedAt: new Date().toISOString() } })
    });
    console.log('✅ Created and published course:', courseId);
  } catch (e) {
    console.error('❌ Failed to create course:', e.message);
    return;
  }

  // 4. Create Lessons
  console.log('\n[4] Creating Lessons...');
  const lessons = [
    {
      title: 'Introduction to React Server Components',
      videoUrl: 'https://www.youtube.com/embed/wm5gMKuwSYk',
      content: 'Server Components allow you to render components on the server, reducing the amount of JavaScript sent to the client. This lesson explores the paradigm shift from traditional SPA client-side rendering.',
      order: 1,
      course: courseId
    },
    {
      title: 'Routing, Layouts, and Navigation',
      videoUrl: 'https://www.youtube.com/embed/ZBRUMMvGEE0',
      content: 'Learn how nested layouts work in the App Router, and how to effectively use the `page.tsx`, `layout.tsx` conventions along with the Next.js `<Link>` component for fast client-side transitions.',
      order: 2,
      course: courseId
    },
    {
      title: 'Advanced Data Fetching & Caching',
      videoUrl: 'https://www.youtube.com/embed/gWJMhFduz7o',
      content: 'Deep dive into the extended `fetch` API, on-demand revalidation, and how to handle mutations securely using Server Actions.',
      order: 3,
      course: courseId
    }
  ];

  for (const lesson of lessons) {
    try {
      await fetchApi('/api/lessons', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ data: lesson })
      });
      console.log(`✅ Created Lesson: ${lesson.title}`);
    } catch (e) {
      console.error(`❌ Failed to create lesson ${lesson.title}:`, e.message);
    }
  }

  // 5. Create Quiz
  console.log('\n[5] Creating Quiz...');
  let quizId;
  try {
    const quizRes = await fetchApi('/api/quizzes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        data: {
          title: 'Next.js 14 Final Assessment',
          maxAttempts: 2,
          course: courseId
        }
      })
    });
    quizId = quizRes.data.documentId;
    console.log('✅ Created Quiz:', quizId);
  } catch(e) {
    console.error('❌ Failed to create quiz:', e.message);
    return;
  }

  // 6. Create Questions
  console.log('\n[6] Creating Questions...');
  const questions = [
    {
      text: 'Which file is used to define a shared UI for a route segment and its children in the App Router?',
      options: ['layout.tsx', 'page.tsx', 'template.tsx', 'route.ts'],
      type: 'mcq',
      correctAnswer: 0,
      feedback: '`layout.tsx` preserves state across navigation, whereas `template.tsx` creates a new instance for each child.',
      quiz: quizId
    },
    {
      text: 'Which of the following are valid ways to fetch data in Next.js 14 Server Components? (Select all that apply)',
      options: [
        'Using the native fetch API with cache options', 
        'Using useEffect and axios', 
        'Querying a database directly (e.g. Prisma) inside the component', 
        'Using getServerSideProps'
      ],
      type: 'multi_select',
      correctAnswer: [0, 2],
      feedback: 'Server Components can securely query databases directly or use native fetch. `useEffect` is for Client Components, and `getServerSideProps` is deprecated in the App Router.',
      quiz: quizId
    },
    {
      text: 'By default, components inside the app directory are...',
      options: ['Client Components', 'Server Components', 'Static Components', 'Edge Components'],
      type: 'mcq',
      correctAnswer: 1,
      feedback: 'Everything in the App Router is a Server Component by default unless you explicitly add the "use client" directive.',
      quiz: quizId
    }
  ];

  for (const q of questions) {
    try {
      await fetchApi('/api/questions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ data: q })
      });
      console.log(`✅ Created Question: ${q.text.substring(0, 30)}...`);
    } catch(e) {
      console.error(`❌ Failed to create question:`, e.message);
    }
  }

  console.log('\n--- Done Seeding Test Course ---');
}

seedTestCourse().catch(console.error);
