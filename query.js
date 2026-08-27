const db = require('better-sqlite3')('.tmp/data.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(r=>r.name).join(', '));
const coursesTable = tables.find(t => t.name.includes('course'));
if (coursesTable) {
    const courses = db.prepare(`SELECT * FROM ${coursesTable.name}`).all();
    console.log('Courses:', courses);
}
