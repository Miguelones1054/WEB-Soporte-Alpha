'use client';

import { ReactNode, useState } from 'react';

export interface RetroTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  cellClassName?: string;
}

export interface RetroInteractiveTableProps<T> {
  columns: RetroTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  panelClassName?: string;
  onRowClick?: (row: T) => void;
}

export function RetroInteractiveTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'Sin registros',
  panelClassName = '',
  onRowClick,
}: RetroInteractiveTableProps<T>) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="retro-tableview-empty">{emptyMessage}</p>;
  }

  const handleRowClick = (row: T, key: string) => {
    setSelectedKey((prev) => (prev === key ? null : key));
    onRowClick?.(row);
  };

  return (
    <div className={`sunken-panel retro-tableview-panel ${panelClassName}`.trim()}>
      <table className="interactive">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = getRowKey(row);
            const highlighted = selectedKey === key;
            return (
              <tr
                key={key}
                className={highlighted ? 'highlighted' : undefined}
                onClick={() => handleRowClick(row, key)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.cellClassName}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
