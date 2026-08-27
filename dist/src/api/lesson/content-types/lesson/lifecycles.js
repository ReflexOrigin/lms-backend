"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async afterDelete(event) {
        const { result } = event;
        if (result && result.documentId) {
            // Find all progress rows related to this lesson
            const progresses = await strapi.documents('api::progress.progress').findMany({
                filters: { lesson: result.documentId }
            });
            // Delete them to avoid orphaned rows skewing course completion percentages
            for (const p of progresses) {
                await strapi.documents('api::progress.progress').delete({
                    documentId: p.documentId
                });
            }
        }
    }
};
