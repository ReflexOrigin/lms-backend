const strapi = require('@strapi/strapi');
strapi().start().then(async app => {
  const users = await app.db.query('plugin::users-permissions.user').findMany({
    where: { username: 'instructor' },
  });
  const user = users[0];
  console.log('Instructor user:', user);
  
  if (user) {
    const filters = { instructor: { documentId: user.documentId } };
    const courses = await app.documents('api::course.course').findMany({
      filters,
      status: 'draft'
    });
    console.log('Courses for instructor:', courses);
  }
  process.exit(0);
});
