const paginate = (array, page, perPage) => {
  if (!array || !array.length) return [];
  const start = (page - 1) * perPage;
  const end   = start + perPage;
  return array.slice(start, end);
};

const totalPages = (totalItems, perPage) => {
  if (!totalItems || totalItems <= 0) return 1;
  return Math.ceil(totalItems / perPage);
};

module.exports = { paginate, totalPages };
