"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreRouter('api::quiz.quiz', {
    config: {
        findOne: { policies: [{ name: 'global::is-enrolled', config: { contentType: 'api::quiz.quiz', courseField: 'course' } }] },
        update: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::quiz.quiz', parentField: 'course', ownerField: 'instructor' } }] },
        delete: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::quiz.quiz', parentField: 'course', ownerField: 'instructor' } }] },
    },
});
