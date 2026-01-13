/**
 * Paginate results from a database query
 * @param {Object} options - Pagination options
 * @param {number} options.page - Current page number
 * @param {number} options.limit - Number of items per page
 * @param {number} options.total - Total number of items
 * @returns {Object} Pagination metadata
 */
const paginateResults = ({ page = 1, limit = 10, total }) => {
    const currentPage = parseInt(page);
    const itemsPerPage = parseInt(limit);
    const totalPages = Math.ceil(total / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    return {
        currentPage,
        itemsPerPage,
        totalItems: total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
        prevPage: hasPrevPage ? currentPage - 1 : null
    };
};

/**
 * Get pagination parameters from request query
 * @param {Object} query - Request query object
 * @returns {Object} Pagination parameters
 */
const getPaginationParams = (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    return {
        page,
        limit,
        skip
    };
};

module.exports = {
    paginateResults,
    getPaginationParams
};