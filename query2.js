const db = require('better-sqlite3')('E:/LMS/lms-backend/data.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(r=>r.name).join(', '));
const coursesTable = tables.find(t => t.name.includes('course') && !t.name.includes('lnk'));
if (coursesTable) {
    const courses = db.prepare(`SELECT document_id, title, slug FROM ${coursesTable.name}`).all();
    console.log('Courses:', courses);
}
