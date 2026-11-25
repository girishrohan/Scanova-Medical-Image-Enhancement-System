// components/ui/data-table.tsx — Reusable typed data table
"use client";

import { useState, useMemo } from "react";
import { COLORS } from "@/lib/config";
import { SkeletonTable } from "./skeleton";
import { EmptyState } from "./empty-state";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  actions?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyTitle = "No data",
  emptyDescription = "No items to display.",
  onRowClick,
  selectable = false,
  onSelectionChange,
  actions,
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const toggleSelect = (key: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelected(newSelected);
    if (onSelectionChange) {
      onSelectionChange(data.filter((item) => newSelected.has(keyExtractor(item))));
    }
  };

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const allKeys = new Set(data.map(keyExtractor));
      setSelected(allKeys);
      onSelectionChange?.(data);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (loading) {
    return <SkeletonTable rows={5} cols={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
      {/* Bulk action bar */}
      {selectable && selected.size > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          background: "#eff6ff",
          borderBottom: "1px solid #bfdbfe",
          fontSize: "0.85rem",
        }}>
          <span style={{ fontWeight: 600, color: COLORS.blue }}>
            {selected.size} selected
          </span>
          <button
            onClick={() => { setSelected(new Set()); onSelectionChange?.([]); }}
            style={{
              background: "none",
              border: "none",
              color: COLORS.muted,
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Clear selection
          </button>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            {selectable && (
              <th style={{ padding: "0.75rem 1rem", width: "40px" }}>
                <input
                  type="checkbox"
                  checked={selected.size === data.length && data.length > 0}
                  onChange={toggleAll}
                  style={{ accentColor: COLORS.blue }}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  fontWeight: 600,
                  color: COLORS.navy,
                  width: col.width,
                  cursor: col.sortable ? "pointer" : "default",
                  userSelect: "none",
                }}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <span style={{ fontSize: "0.7rem" }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
            ))}
            {actions && <th style={{ padding: "0.75rem 1rem", width: "80px" }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => {
            const key = keyExtractor(item);
            const isSelected = selected.has(key);
            return (
              <tr
                key={key}
                style={{
                  borderBottom: "1px solid #f1f5f9",
                  background: isSelected ? "#eff6ff" : "transparent",
                  cursor: onRowClick ? "pointer" : "default",
                }}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(key)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ accentColor: COLORS.blue }}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: "0.75rem 1rem", color: COLORS.text }}>
                    {col.render ? col.render(item) : String((item as any)[col.key])}
                  </td>
                ))}
                {actions && (
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {actions(item)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}