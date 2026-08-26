"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
    async create(ctx) {
        const user = ctx.state.user;
        // Safety check
        if (!user) {
            return ctx.unauthorized('You must be logged in to take a quiz.');
        }
        const { data } = ctx.request.body;
        if (!data.quiz) {
            return ctx.badRequest('Quiz ID is required');
        }
        const quizId = data.quiz;
        const submittedAnswers = data.answers || {}; // { questionDocumentId: selectedOptionIndex }
        // Fetch the quiz and its questions
        const quiz = await strapi.documents('api::quiz.quiz').findOne({
            documentId: quizId,
            populate: ['questions'],
        });
        if (!quiz) {
            return ctx.notFound('Quiz not found');
        }
        const questions = quiz.questions || [];
        let score = 0;
        const totalQuestions = questions.length;
        // We need to fetch questions directly because correctAnswer is private and might be omitted by default in some contexts,
        // though strapi.documents internal API returns private fields!
        for (const q of questions) {
            const qDoc = await strapi.documents('api::question.question').findOne({
                documentId: q.documentId
            });
            const selectedAnswer = submittedAnswers[q.documentId];
            // Note: correctAnswer is an integer representing the index of the correct option
            if (qDoc && selectedAnswer !== undefined && selectedAnswer !== null && parseInt(selectedAnswer) === qDoc.correctAnswer) {
                score += 1;
            }
        }
        const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
        // Enforce one attempt per quiz per student (or update it if you allow multiple, here we just create a new one, but let's check if one exists)
        // Actually, creating a new attempt is fine (tracking history), but let's see if we want to overwrite. The plan just says "Student can review their attempt". We'll just create it.
        ctx.request.body.data = {
            quiz: quizId,
            student: user.documentId,
            answers: submittedAnswers,
            score,
            totalQuestions,
            percentage,
            attemptedAt: new Date().toISOString()
        };
        return await super.create(ctx);
    },
    async update(ctx) {
        return ctx.forbidden('Quiz attempts cannot be modified once submitted.');
    }
}));
