import { captureException } from "@sentry/react";
import { Skeleton } from "@telegram-apps/telegram-ui";
import React, { useCallback } from "react";
import { SWRResponse } from "swr";

export type WithSwrProps<T, Props> = {
  swr: SWRResponse<T, unknown, unknown>;
  Component: (props: { data: T | null } & Props) => React.ReactNode;
  props: Props;
};

export function WithSwr<T, Props = object>({
  swr,
  Component,
  props,
}: WithSwrProps<T, Props>): React.ReactNode {
  const { data, error, isValidating, mutate } = swr;

  const hasData = error == undefined && !isValidating;

  const onRefreshClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      mutate().catch(captureException);
    },
    [mutate]
  );

  const propsWithData = { ...props, data: hasData ? data! : null };

  return (
    <div className="relative">
      <Skeleton visible={!hasData}>
        <Component {...propsWithData} />
      </Skeleton>
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
