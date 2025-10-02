import { Skeleton } from "@telegram-apps/telegram-ui";
import React, { useCallback } from "react";
import { SWRResponse } from "swr";

export type WithSwrProps<T> = {
  swr: SWRResponse<T, unknown, unknown>;
  render: (data: T | null) => React.ReactNode;
};

export function WithSwr<T>({ swr, render }: WithSwrProps<T>): React.ReactNode {
  const { data, error, isLoading, mutate } = swr;

  const hasData = error == undefined && !isLoading;

  const onRefreshClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      void mutate();
    },
    [mutate]
  );

  return (
    <div className="relative">
      <Skeleton visible={!hasData}>{render(hasData ? data! : null)}</Skeleton>
      {error != undefined ? (
        <div className="absolute top-0 left-0 h-full w-full z-10 flex flex-col justify-center items-center">
          <div>An unexpected error has occured</div>
          <div>
            <a
              className="text-(--tgui--link_color)"
              href="/#"
              onClick={onRefreshClick}
            >
              Refresh
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
