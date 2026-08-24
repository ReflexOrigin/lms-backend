const fs = require('fs');
const path = require('path');

const schemas = {
  course: {
    kind: 'collectionType',
    collectionName: 'courses',
    info: { singularName: 'course', pluralName: 'courses', displayName: 'Course' },
    options: { draftAndPublish: true },
    attributes: {
      title: { type: 'string', required: true },
      description: { type: 'text' },
      thumbnail: { type: 'string' },
      instructor: { type: 'relation', relation: 'manyToOne', target: 'plugin::users-permissions.user' },
      lessons: { type: 'relation', relation: 'oneToMany', target: 'api::lesson.lesson', mappedBy: 'course' },
      quizzes: { type: 'relation', relation: 'oneToMany', target: 'api::quiz.quiz', mappedBy: 'course' },
      enrollments: { type: 'relation', relation: 'oneToMany', target: 'api::enrollment.enrollment', mappedBy: 'course' },
      progresses: { type: 'relation', relation: 'oneToMany', target: 'api::progress.progress', mappedBy: 'course' },
    },
  },
  lesson: {
    kind: 'collectionType',
    collectionName: 'lessons',
    info: { singularName: 'lesson', pluralName: 'lessons', displayName: 'Lesson' },
    options: { draftAndPublish: false },
    attributes: {
      title: { type: 'string', required: true },
      content: { type: 'richtext' },
      videoUrl: { type: 'string' },
      order: { type: 'integer', required: true },
      course: { type: 'relation', relation: 'manyToOne', target: 'api::course.course', inversedBy: 'lessons' },
    },
  },
  quiz: {
    kind: 'collectionType',
    collectionName: 'quizzes',
    info: { singularName: 'quiz', pluralName: 'quizzes', displayName: 'Quiz' },
    options: { draftAndPublish: false },
    attributes: {
      title: { type: 'string', required: true },
      course: { type: 'relation', relation: 'manyToOne', target: 'api::course.course', inversedBy: 'quizzes' },
      questions: { type: 'relation', relation: 'oneToMany', target: 'api::question.question', mappedBy: 'quiz' },
    },
  },
  question: {
    kind: 'collectionType',
    collectionName: 'questions',
    info: { singularName: 'question', pluralName: 'questions', displayName: 'Question' },
    options: { draftAndPublish: false },
    attributes: {
      text: { type: 'string', required: true },
      options: { type: 'json', required: true },
      correctAnswer: { type: 'integer', required: true, private: true },
      quiz: { type: 'relation', relation: 'manyToOne', target: 'api::quiz.quiz', inversedBy: 'questions' },
    },
  },
  enrollment: {
    kind: 'collectionType',
    collectionName: 'enrollments',
    info: { singularName: 'enrollment', pluralName: 'enrollments', displayName: 'Enrollment' },
    options: { draftAndPublish: false },
    attributes: {
      enrolledAt: { type: 'datetime' },
      student: { type: 'relation', relation: 'manyToOne', target: 'plugin::users-permissions.user' },
      course: { type: 'relation', relation: 'manyToOne', target: 'api::course.course', inversedBy: 'enrollments' },
    },
  },
  progress: {
    kind: 'collectionType',
    collectionName: 'progresses',
    info: { singularName: 'progress', pluralName: 'progresses', displayName: 'Progress' },
    options: { draftAndPublish: false },
    attributes: {
      completed: { type: 'boolean', default: false },
      completedAt: { type: 'datetime' },
      student: { type: 'relation', relation: 'manyToOne', target: 'plugin::users-permissions.user' },
      course: { type: 'relation', relation: 'manyToOne', target: 'api::course.course', inversedBy: 'progresses' },
      lesson: { type: 'relation', relation: 'manyToOne', target: 'api::lesson.lesson' },
    },
  },
  'blog-post': {
    kind: 'collectionType',
    collectionName: 'blog_posts',
    info: { singularName: 'blog-post', pluralName: 'blog-posts', displayName: 'BlogPost' },
    options: { draftAndPublish: true },
    attributes: {
      title: { type: 'string', required: true },
      body: { type: 'richtext', required: true },
      coverImage: { type: 'string' },
      author: { type: 'relation', relation: 'manyToOne', target: 'plugin::users-permissions.user' },
    },
  },
  'quiz-attempt': {
    kind: 'collectionType',
    collectionName: 'quiz_attempts',
    info: { singularName: 'quiz-attempt', pluralName: 'quiz-attempts', displayName: 'QuizAttempt' },
    options: { draftAndPublish: false },
    attributes: {
      score: { type: 'integer' },
      totalQuestions: { type: 'integer' },
      percentage: { type: 'decimal' },
      answers: { type: 'json' },
      attemptedAt: { type: 'datetime' },
      student: { type: 'relation', relation: 'manyToOne', target: 'plugin::users-permissions.user' },
      quiz: { type: 'relation', relation: 'manyToOne', target: 'api::quiz.quiz' },
    },
  }
};

Object.entries(schemas).forEach(([name, schema]) => {
  const baseDir = path.join(__dirname, 'src', 'api', name);
  const typesDir = path.join(baseDir, 'content-types', name);
  const controllersDir = path.join(baseDir, 'controllers');
  const routesDir = path.join(baseDir, 'routes');
  const servicesDir = path.join(baseDir, 'services');

  [typesDir, controllersDir, routesDir, servicesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Write schema.json
  fs.writeFileSync(path.join(typesDir, 'schema.json'), JSON.stringify(schema, null, 2));

  // Write default core controller
  fs.writeFileSync(path.join(controllersDir, `${name}.ts`), `import { factories } from '@strapi/strapi';\n\nexport default factories.createCoreController('api::${name}.${name}');\n`);

  // Write default router
  fs.writeFileSync(path.join(routesDir, `${name}.ts`), `import { factories } from '@strapi/strapi';\n\nexport default factories.createCoreRouter('api::${name}.${name}');\n`);

  // Write default service
  fs.writeFileSync(path.join(servicesDir, `${name}.ts`), `import { factories } from '@strapi/strapi';\n\nexport default factories.createCoreService('api::${name}.${name}');\n`);
});

console.log('Successfully generated 8 content types.');
