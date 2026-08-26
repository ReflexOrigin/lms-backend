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
                    course: { documentId: quiz.course.documentId }
                }
            });
            if (!enrollment) {
                return ctx.forbidden('You are not enrolled in the course for this quiz.');
            }
        }
        // 2. Max Attempts Check
        const maxAttempts = quiz.maxAttempts || 1;
        const existingAttempts = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
            filters: {
                student: user.documentId,
                quiz: quiz.documentId
            }
        });
        if (existingAttempts.length >= maxAttempts) {
            return ctx.badRequest(`You have reached the maximum number of attempts (${maxAttempts}) for this quiz.`);
        }
        // 3. Grading and Tamper Validation
        const questions = quiz.questions || [];
        let score = 0;
        const totalQuestions = questions.length;
        // Track valid question IDs to prevent grading foreign IDs
        const validQuestionIds = new Set(questions.map((q) => q.documentId));
        // Check if any submitted answer doesn't belong to this quiz
        for (const submittedQId of Object.keys(submittedAnswers)) {
            if (!validQuestionIds.has(submittedQId)) {
                return ctx.badRequest(`Question ${submittedQId} does not belong to this quiz.`);
            }
        }
        const gradedFeedback = {};
        for (const q of questions) {
            const qDoc = await strapi.documents('api::question.question').findOne({
                documentId: q.documentId
            });
            const selectedAnswer = submittedAnswers[q.documentId];
            let isCorrect = false;
            if (qDoc && selectedAnswer !== undefined && selectedAnswer !== null) {
                if (qDoc.type === 'multi_select') {
                    // Compare arrays
                    const correctArr = Array.isArray(qDoc.correctAnswer) ? qDoc.correctAnswer : [];
                    const selectedArr = Array.isArray(selectedAnswer) ? selectedAnswer : [];
                    if (correctArr.length === selectedArr.length && correctArr.every(val => selectedArr.includes(val))) {
                        isCorrect = true;
                    }
                }
                else {
                    // Default mcq
                    if (parseInt(selectedAnswer) === qDoc.correctAnswer) {
                        isCorrect = true;
                    }
                }
            }
            if (isCorrect) {
                score += 1;
            }
            // Attach feedback context for the response
            if (qDoc && qDoc.feedback) {
                gradedFeedback[q.documentId] = qDoc.feedback;
            }
        }
        const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
        const attemptData = {
            quiz: quizId,
            student: user.documentId,
            answers: submittedAnswers,
            score,
            totalQuestions,
            percentage,
            attemptedAt: new Date().toISOString()
        };
        const response = await super.create({
            ...ctx,
            request: {
                ...ctx.request,
                body: { data: attemptData }
            }
        });
        // Attach feedback to the returned payload safely (doesn't save to DB field if not in schema, but returned in API)
        if (response === null || response === void 0 ? void 0 : response.data) {
            response.data.feedback = gradedFeedback;
        }
        return response;
    },
    async update(ctx) {
        return ctx.forbidden('Quiz attempts cannot be modified once submitted.');
    }
}));
