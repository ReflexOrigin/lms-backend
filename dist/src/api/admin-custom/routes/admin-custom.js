"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/admin-custom/stats',
            handler: 'admin-custom.getStats',
        },
        {
            method: 'GET',
            path: '/admin-custom/users',
            handler: 'admin-custom.getUsers',
        },
        {
            method: 'PUT',
            path: '/admin-custom/users/:id/role',
            handler: 'admin-custom.updateUserRole',
        },
        {
            method: 'DELETE',
            path: '/admin-custom/users/:id',
            handler: 'admin-custom.deleteUser',
        }
    ]
};
