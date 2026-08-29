const Database = require('better-sqlite3');
const db = new Database('./data.db');
const rows = db.prepare("SELECT DISTINCT action FROM up_permissions WHERE action LIKE '%blog-post%'").all();
console.log(rows);
