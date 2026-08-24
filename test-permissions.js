const STRAPI_URL = 'http://localhost:1337';

async function testPermissions() {
  console.log('--- Running Permission Matrix Test ---');

  // 1. Test Registration Hardening (Layer 3)
  console.log('\\n[1] Testing Registration Hardening');
  
  const runId = Math.floor(Math.random() * 10000);
  // 1a. Try to register as admin_role (should fail)
  let res = await fetch(`${STRAPI_URL}/api/auth/local/register?requestedRole=admin_role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `hacker_${runId}`,
      email: `hacker_${runId}@test.com`,
      password: 'Password123!'
    })
  });
  if (res.status === 400) {
    console.log('✅ PASS: Rejected registration with admin_role');
  } else {
    console.error(`❌ FAIL: Allowed registration with admin_role (${res.status})`);
  }

  // 1b. Register valid student
  res = await fetch(`${STRAPI_URL}/api/auth/local/register?requestedRole=authenticated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `student_${runId}`,
      email: `student_${runId}@test.com`,
      password: 'Password123!'
    })
  });
  let studentJwt = null;
  if (res.ok) {
    const data = await res.json();
    studentJwt = data.jwt;
    console.log('✅ PASS: Registered valid student');
  } else {
    console.error('❌ FAIL: Could not register student', await res.text());
  }

  // 1c. Register valid instructor
  res = await fetch(`${STRAPI_URL}/api/auth/local/register?requestedRole=instructor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `instructor_${runId}`,
      email: `instructor_${runId}@test.com`,
      password: 'Password123!'
    })
  });
  let instructorJwt = null;
  if (res.ok) {
    const data = await res.json();
    instructorJwt = data.jwt;
    console.log('✅ PASS: Registered valid instructor');
  } else {
    console.error('❌ FAIL: Could not register instructor', await res.text());
  }

  // 2. Test Layer 0 (U&P Matrix)
  console.log('\\n[2] Testing Layer 0 (Permission Matrix)');

  // 2a. Student creating a course (should fail with 403)
  res = await fetch(`${STRAPI_URL}/api/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentJwt}` },
    body: JSON.stringify({ data: { title: 'Hacked Course' } })
  });
  if (res.status === 403) {
    console.log('✅ PASS: Student blocked from creating course (Layer 0)');
  } else {
    console.error(`❌ FAIL: Student could create course! Status: ${res.status}`, await res.text());
  }

  // 2b. Instructor creating a course (should pass)
  let courseId = null;
  res = await fetch(`${STRAPI_URL}/api/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instructorJwt}` },
    body: JSON.stringify({ data: { title: 'My Legit Course' } })
  });
  if (res.ok) {
    const data = await res.json();
    courseId = data.data.documentId;
    console.log('✅ PASS: Instructor created course successfully');
  } else {
    console.error(`❌ FAIL: Instructor could not create course! Status: ${res.status}`, await res.text());
  }

  // 3. Test Layer 2 (Controller Override Filtering)
  console.log('\\n[3] Testing Layer 2 (Controller Override Filtering)');
  
  // Since instructor created it, controller forced instructor = user.id.
  // When instructor fetches courses, they should see it.
  res = await fetch(`${STRAPI_URL}/api/courses`, {
    headers: { 'Authorization': `Bearer ${instructorJwt}` }
  });
  if (res.ok) {
    const data = await res.json();
    if (data.data.some(c => c.title === 'My Legit Course')) {
      console.log('✅ PASS: Instructor sees their own course');
    } else {
      console.error('❌ FAIL: Instructor does not see their own course. Data:', JSON.stringify(data.data));
    }
  } else {
    console.error(`❌ FAIL: Fetching courses returned ${res.status}:`, await res.text());
  }

  console.log('\\nDone.');
}

testPermissions().catch(console.error);
