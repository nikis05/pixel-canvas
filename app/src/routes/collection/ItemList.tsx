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

  const rowsCount = items.length;
  const rowVirtualizer = useVirtualizer({
    count: rowsCount + (hasNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => Math.min(window.innerWidth, 280) + 102,
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
            const item = items[row.index];
            content = (
              <>
                <div className="w-[min(100%,_280px)] p-5 flex justify-center">
                  <Item data={item} />
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
