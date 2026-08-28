import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user;
    
    // Safety check
    if (!user) {
      return ctx.unauthorized('You must be logged in to take a quiz.');
    }

    const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id }
    });

    const { data } = ctx.request.body;
    
    if (!data.quiz) {
      return ctx.badRequest('Quiz ID is required');
    }

    const quizId = data.quiz;
    const submittedAnswers = data.answers || {}; // { questionDocumentId: selectedOptionIndex }

    // Fetch the quiz and its questions
    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: quizId,
      populate: ['questions', 'course'],
    });

    if (!quiz) {
      return ctx.notFound('Quiz not found');
    }

    // 1. Enrollment Validation
    if (quiz.course) {
      const enrollment = await strapi.db.query('api::enrollment.enrollment').findOne({
        where: {
          student: user.id,
          course: { documentId: (quiz.course as any).documentId }
        }
      });
      if (!enrollment) {
        return ctx.forbidden('You are not enrolled in the course for this quiz.');
      }
    }

    // 2. Max Attempts Check
    const maxAttempts = (quiz as any).maxAttempts || 1;
    const existingAttempts = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
      filters: {
        student: fullUser.documentId,
        quiz: quiz.documentId
      } as any
    });

    if (existingAttempts.length >= maxAttempts) {
      return ctx.badRequest(`You have reached the maximum number of attempts (${maxAttempts}) for this quiz.`);
    }

    // 3. Grading and Tamper Validation
    const questions = quiz.questions || [];
    let score = 0;
    const totalQuestions = questions.length;
    
    // Track valid question IDs to prevent grading foreign IDs
    const validQuestionIds = new Set(questions.map((q: any) => q.documentId));
    
    // Check if any submitted answer doesn't belong to this quiz
    for (const submittedQId of Object.keys(submittedAnswers)) {
      if (!validQuestionIds.has(submittedQId)) {
        return ctx.badRequest(`Question ${submittedQId} does not belong to this quiz.`);
      }
    }

    const gradedFeedback: Record<string, string> = {};

    for (const q of questions) {
      const qDoc = await strapi.documents('api::question.question').findOne({
        documentId: q.documentId
      });
      
      const selectedAnswer = submittedAnswers[q.documentId];
      let isCorrect = false;

      if (qDoc && selectedAnswer !== undefined && selectedAnswer !== null) {
        if ((qDoc as any).type === 'multi_select') {
          // Compare arrays
          const correctArr = Array.isArray(qDoc.correctAnswer) ? qDoc.correctAnswer : [];
          const selectedArr = Array.isArray(selectedAnswer) ? selectedAnswer : [];
          if (correctArr.length === selectedArr.length && correctArr.every(val => selectedArr.includes(val))) {
            isCorrect = true;
          }
        } else {
          // Default mcq
          if (parseInt(selectedAnswer) === (qDoc as any).correctAnswer) {
            isCorrect = true;
          }
        }
      }

      if (isCorrect) {
        score += 1;
      }

      // Attach feedback context for the response
      if (qDoc && (qDoc as any).feedback) {
        gradedFeedback[q.documentId] = (qDoc as any).feedback;
      }
    }

    const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

    const attemptData = {
      quiz: quizId,
      student: fullUser.documentId,
      answers: submittedAnswers,
      score,
      totalQuestions,
      percentage,
      attemptedAt: new Date().toISOString()
    };

    ctx.request.body = { data: attemptData };
    const response = await super.create(ctx);

    // Attach feedback to the returned payload safely (doesn't save to DB field if not in schema, but returned in API)
    if (response?.data) {
      response.data.feedback = gradedFeedback;
    }

    return response;
  },
  
  async update(ctx: any) {
    return ctx.forbidden('Quiz attempts cannot be modified once submitted.');
  },

  async find(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: ['role']
    });

    if (fullUser?.role?.type === 'authenticated') {
      ctx.query.filters = {
        ...(ctx.query.filters as object || {}),
        student: user.id,
      };
    } else if (fullUser?.role?.type === 'instructor') {
      ctx.query.filters = {
        ...(ctx.query.filters as object || {}),
        quiz: {
          course: {
            instructor: { id: user.id }
          }
        }
      };
    }

    return super.find(ctx);
  },

  async findOne(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const response = await super.findOne(ctx);
    if (!response || !response.data) return response;

    const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: ['role']
    });

    if (fullUser?.role?.type === 'authenticated') {
      const dbEntity = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
        where: { documentId: ctx.params.id },
        populate: ['student']
      });

      if (!dbEntity || !dbEntity.student || dbEntity.student.id !== user.id) {
        return ctx.forbidden('You are not authorized to view this quiz attempt.');
      }
    } else if (fullUser?.role?.type === 'instructor') {
      const dbEntity = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
        where: { documentId: ctx.params.id },
        populate: {
          quiz: {
            populate: {
              course: {
                populate: ['instructor']
              }
            }
          }
        }
      });
      
      const course = (dbEntity as any)?.quiz?.course;
      if (!course || !course.instructor || course.instructor.id !== user.id) {
        return ctx.forbidden('You are not authorized to view this quiz attempt.');
      }
    }

    return response;
  }
}));