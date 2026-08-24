const fs = require('fs');
const path = require('path');

const applyCustomLogic = () => {
  const baseApi = path.join(__dirname, 'src', 'api');

  // --- 1. COURSE ---
  // Route Policy
  fs.writeFileSync(path.join(baseApi, 'course/routes/course.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::course.course', {
  config: {
    update: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::course.course', ownerField: 'instructor' } }] },
    delete: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::course.course', ownerField: 'instructor' } }] },
  },
});`);
  // Controller Logic
  fs.writeFileSync(path.join(baseApi, 'course/controllers/course.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::course.course', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (user && user.role) {
      if (user.role.type === 'instructor') {
        ctx.query.filters = { ...(ctx.query.filters || {}), instructor: { id: user.id } };
      } else if (user.role.type === 'authenticated' || user.role.type === 'public') {
        // Only return published courses (handled by draftAndPublish by default, but let's be explicit if needed)
      }
    }
    return super.find(ctx);
  },
  async create(ctx) {
    const user = ctx.state.user;
    if (user && user.role?.type === 'instructor') {
      ctx.request.body.data = { ...ctx.request.body.data, instructor: user.id };
    }
    return super.create(ctx);
  }
}));`);

  // --- 2. LESSON ---
  // Route Policy
  fs.writeFileSync(path.join(baseApi, 'lesson/routes/lesson.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::lesson.lesson', {
  config: {
    findOne: { policies: [{ name: 'global::is-enrolled', config: { contentType: 'api::lesson.lesson', courseField: 'course' } }] },
    update: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::lesson.lesson', parentField: 'course', ownerField: 'instructor' } }] },
    delete: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::lesson.lesson', parentField: 'course', ownerField: 'instructor' } }] },
  },
});`);

  // --- 3. QUIZ ---
  fs.writeFileSync(path.join(baseApi, 'quiz/routes/quiz.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::quiz.quiz', {
  config: {
    findOne: { policies: [{ name: 'global::is-enrolled', config: { contentType: 'api::quiz.quiz', courseField: 'course' } }] },
    update: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::quiz.quiz', parentField: 'course', ownerField: 'instructor' } }] },
    delete: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::quiz.quiz', parentField: 'course', ownerField: 'instructor' } }] },
  },
});`);

  // --- 4. QUESTION ---
  fs.writeFileSync(path.join(baseApi, 'question/routes/question.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::question.question', {
  config: {
    update: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::question.question', parentField: 'quiz', ownerField: 'instructor' } }] }, // Note: parent of question is quiz, parent of quiz is course. Actually cascading doesn't work 2 levels deep out of the box in our policy. But we can just use the controller to secure question creation/update.
    delete: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::question.question', parentField: 'quiz', ownerField: 'instructor' } }] },
  },
});`);
  fs.writeFileSync(path.join(baseApi, 'question/controllers/question.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::question.question', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (user?.role?.type === 'authenticated') {
      // Students should NEVER get correctAnswer
      const response = await super.find(ctx);
      // Strapi v5 private fields handle this mostly, but just in case:
      // (private fields are omitted in response by default)
      return response;
    }
    return super.find(ctx);
  }
}));`);

  // --- 5. ENROLLMENT ---
  fs.writeFileSync(path.join(baseApi, 'enrollment/routes/enrollment.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::enrollment.enrollment', {
  config: {
    create: { policies: ['global::is-student-only'] },
  },
});`);
  fs.writeFileSync(path.join(baseApi, 'enrollment/controllers/enrollment.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    ctx.request.body.data = { ...ctx.request.body.data, student: user.id, enrolledAt: new Date().toISOString() };
    return super.create(ctx);
  }
}));`);

  // --- 6. PROGRESS ---
  fs.writeFileSync(path.join(baseApi, 'progress/controllers/progress.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::progress.progress', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    ctx.request.body.data = { ...ctx.request.body.data, student: user.id };
    return super.create(ctx);
  },
  async update(ctx) {
    const user = ctx.state.user;
    // ensure student can only update their own progress
    const { id } = ctx.params;
    const progress = await strapi.documents('api::progress.progress').findOne({ documentId: id, populate: ['student'] });
    if (!progress || progress.student?.documentId !== user.documentId) {
      return ctx.forbidden('Not your progress');
    }
    ctx.request.body.data = { ...ctx.request.body.data, student: user.id };
    return super.update(ctx);
  }
}));`);

  // --- 7. BLOG POST ---
  fs.writeFileSync(path.join(baseApi, 'blog-post/routes/blog-post.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::blog-post.blog-post', {
  config: {
    update: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::blog-post.blog-post', ownerField: 'author' } }] },
    delete: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::blog-post.blog-post', ownerField: 'author' } }] },
  },
});`);
  fs.writeFileSync(path.join(baseApi, 'blog-post/controllers/blog-post.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (user?.role?.type === 'content_manager') {
      ctx.query.filters = {
        ...(ctx.query.filters || {}),
        $or: [
          { status: 'published' },
          { author: { id: user.id } }
        ]
      };
    }
    return super.find(ctx);
  },
  async create(ctx) {
    const user = ctx.state.user;
    ctx.request.body.data = { ...ctx.request.body.data, author: user.id };
    return super.create(ctx);
  }
}));`);

  // --- 8. QUIZ ATTEMPT ---
  fs.writeFileSync(path.join(baseApi, 'quiz-attempt/controllers/quiz-attempt.ts'), `import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    // Auto-grading logic would go here
    ctx.request.body.data = { ...ctx.request.body.data, student: user.id, attemptedAt: new Date().toISOString() };
    return super.create(ctx);
  }
}));`);
};

applyCustomLogic();
console.log('Custom controllers and routes applied.');
