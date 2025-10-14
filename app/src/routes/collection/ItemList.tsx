import { ItemData } from "@/model/ItemData";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FC, useEffect, useRef } from "react";
import { Item } from "./Item";
import { Spinner } from "@telegram-apps/telegram-ui";

export const ItemList: FC<{
  items: ItemData[];
  loading: boolean;
  error: boolean;
  fetchMore: () => void;
  hasNextPage: boolean;
}> = ({ items, error, fetchMore, hasNextPage }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowsCount = Math.ceil(items.length / 2);
  const rowVirtualizer = useVirtualizer({
    count: rowsCount + (hasNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 408,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!hasNextPage) return;
    const last = virtualItems.at(virtualItems.length - 1);
    if (last && last.index >= rowsCount) {
      fetchMore();
    }
  }, [virtualItems, rowsCount, fetchMore, hasNextPage]);

  return (
    <div ref={parentRef} className="h-full w-full overflow-y-auto">
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((row) => {
          const isLoaderRow = row.index > rowsCount - 1;

          let content;

          if (isLoaderRow) {
            content = error ? (
              "An unexpected error has ocurred. Please reload the page."
            ) : (
              <Spinner size="l" />
            );
          } else {
            const item1 = items[row.index * 2];
            const item2 = items.at(row.index * 2 + 1);
            content = (
              <>
                <div className="p-5 w-[min(100%,_280px)]">
                  <Item data={item1} />
                </div>
                <div className="p-5 w-[min(100%,_280px)]">
                  {item2 ? <Item data={item2} /> : <div className="w-65" />}
                </div>
              </>
            );
          }

          return (
            <div
              key={row.key}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${row.size}px`,
                transform: `translateY(${row.start}px)`,
              }}
            >
              <div className="flex justify-center">{content}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
