"use client";

import { useMemo, useState } from "react";

export function usePagination(total: number, initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const maxPage = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return {
    page,
    pageSize,
    maxPage,
    setPage: (next: number) => setPage(Math.min(Math.max(1, next), maxPage)),
    setPageSize: (next: number) => {
      setPageSize(next);
      setPage(1);
    }
  };
}
