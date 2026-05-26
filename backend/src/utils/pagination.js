'use strict';

function paginate(query) {
  const page  = Math.max(1, parseInt(query.page, 10)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  return { limit, offset, page };
}

function paginatedResponse(rows, count, { page, limit }) {
  return {
    data: rows,
    meta: {
      total:       count,
      page,
      limit,
      totalPages:  Math.ceil(count / limit),
      hasNextPage: page * limit < count,
      hasPrevPage: page > 1,
    },
  };
}

module.exports = { paginate, paginatedResponse };
