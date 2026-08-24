const fs = require('fs');
const path = require('path');

const baseApi = path.join(__dirname, 'src', 'api');

// --- 5. ENROLLMENT ---
fs.writeFileSync(path.join(baseApi, 'enrollment/controllers/enrollment.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user;
    if (ctx.request.body?.data?.student) delete ctx.request.body.data.student;
    ctx.request.body.data = { ...ctx.request.body.data, enrolledAt: new Date().toISOString() };
    const response = await super.create(ctx);
    if (user && response?.data?.documentId) {
      await strapi.documents('api::enrollment.enrollment').update({
        documentId: response.data.documentId,
        data: { student: user.documentId }
      });
    }
    return response;
  }
}));`);

// --- 6. PROGRESS ---
fs.writeFileSync(path.join(baseApi, 'progress/controllers/progress.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::progress.progress', ({ strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user;
    if (ctx.request.body?.data?.student) delete ctx.request.body.data.student;
    const response = await super.create(ctx);
    if (user && response?.data?.documentId) {
      await strapi.documents('api::progress.progress').update({
        documentId: response.data.documentId,
        data: { student: user.documentId }
      });
    }
    return response;
  },
  async update(ctx: any) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    const progress = await strapi.documents('api::progress.progress').findOne({ documentId: id, populate: ['student'] });
    if (!progress || progress.student?.documentId !== user.documentId) {
      return ctx.forbidden('Not your progress');
    }
    if (ctx.request.body?.data?.student) delete ctx.request.body.data.student;
    return super.update(ctx); // student is already attached anyway
  }
}));`);

// --- 7. BLOG POST ---
fs.writeFileSync(path.join(baseApi, 'blog-post/controllers/blog-post.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
  async find(ctx: any) {
    const user = ctx.state.user;
    if (user?.role?.type === 'content_manager') {
      ctx.query.filters = {
        ...(ctx.query.filters || {}),
        $or: [
          { status: 'published' },
          { author: { documentId: user.documentId } }
        ]
      };
    }
    return super.find(ctx);
  },
  async create(ctx: any) {
    const user = ctx.state.user;
    if (ctx.request.body?.data?.author) delete ctx.request.body.data.author;
    const response = await super.create(ctx);
    if (user && response?.data?.documentId) {
      await strapi.documents('api::blog-post.blog-post').update({
        documentId: response.data.documentId,
        data: { author: user.documentId }
      });
    }
    return response;
  }
}));`);

// --- 8. QUIZ ATTEMPT ---
fs.writeFileSync(path.join(baseApi, 'quiz-attempt/controllers/quiz-attempt.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user;
    if (ctx.request.body?.data?.student) delete ctx.request.body.data.student;
    ctx.request.body.data = { ...ctx.request.body.data, attemptedAt: new Date().toISOString() };
    const response = await super.create(ctx);
    if (user && response?.data?.documentId) {
      await strapi.documents('api::quiz-attempt.quiz-attempt').update({
        documentId: response.data.documentId,
        data: { student: user.documentId }
      });
    }
    return response;
  }
}));`);

console.log('Fixed controllers');
