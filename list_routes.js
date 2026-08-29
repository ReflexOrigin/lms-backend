const strapi = require('@strapi/strapi');
strapi().start().then(app => {
  const routes = app.server.listRoutes();
  const blogRoutes = routes.filter(r => r.path.includes('blog-post'));
  console.log(blogRoutes.map(r => `${r.method} ${r.path}`));
  process.exit(0);
});
