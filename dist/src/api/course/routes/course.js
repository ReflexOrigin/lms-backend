"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreRouter('api::course.course', {
    config: {
        update: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::course.course', ownerField: 'instructor' } }] },
        delete: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::course.course', ownerField: 'instructor' } }] },
    },
});
