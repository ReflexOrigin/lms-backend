const Database = require('better-sqlite3');
const db = new Database('data.db');

const tables = [
  'progresses',
  'progresses_student_lnk',
  'progresses_course_lnk',
  'progresses_lesson_lnk',
  'enrollments',
  'enrollments_student_lnk',
  'enrollments_course_lnk'
];

for (const table of tables) {
  db.prepare(`DELETE FROM ${table}`).run();
  console.log(`Deleted all from ${table}`);
}
