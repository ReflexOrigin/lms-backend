"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreRouter('api::blog-post.blog-post', {
    config: {
        update: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::blog-post.blog-post', ownerField: 'author' } }] },
        delete: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::blog-post.blog-post', ownerField: 'author' } }] },
    },
});
