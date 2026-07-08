export const paginate = (array, page, perPage) => {
  if (!array || !array.length) return [];
  const start = (page - 1) * perPage;
  const end   = start + perPage;
  return array.slice(start, end);
};

// Total pages - minimum 1
export const totalPages = (totalItems, perPage) => {
  if (!totalItems || totalItems <= 0) return 1;
  return Math.ceil(totalItems / perPage);
};

// Generate page numbers with ellipsis
export const getPageNumbers = (currentPage, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set([1, total]);

  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i > 0 && i <= total) pages.add(i);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);

  const result = [];
  sorted.forEach((page, idx) => {
    if (idx > 0 && page - sorted[idx - 1] > 1) {
      result.push('...');
    }
    result.push(page);
  });

  return result;
};
