import { ItemData } from "@/model/ItemData";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FC, useEffect, useRef } from "react";
import { Item } from "./Item";

export const ItemList: FC<{
  items: ItemData[];
  loading: boolean;
  error: boolean;
  fetchMore: () => void;
}> = ({ items, loading, error, fetchMore }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowsCount = Math.ceil(items.length / 2);
  const rowVirtualizer = useVirtualizer({
    count: rowsCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 408,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const [last] = virtualItems.slice(-1);
    if (last && last.index >= rowsCount - 1) {
      fetchMore();
    }
  }, [virtualItems, rowsCount, fetchMore]);

  return (
    <div ref={parentRef} className="h-full w-full overflow-y-auto">
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((row) => {
          const item1 = items[row.index * 2];
          const item2 = items.at(row.index * 2 + 1);
          return (
            <div
              key={row.key}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${row.size}px`,
                transform: `translateY(${row.start}px)`,
              }}
            >
              <div className="flex justify-center">
                <div className="p-5">
                  <Item data={item1} />
                </div>
                <div className="p-5">
                  {item2 ? <Item data={item2} /> : <div className="w-65" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {loading && (
        <div style={{ padding: 16, textAlign: "center" }}>Loading…</div>
      )}
      {error && <div style={{ padding: 16, textAlign: "center" }}>Error</div>}
    </div>
  );
};
