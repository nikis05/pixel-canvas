import { useNavigate } from "react-router-dom";
import {
  hideBackButton,
  onBackButtonClick,
  showBackButton,
} from "@telegram-apps/sdk-react";
import { type PropsWithChildren, useEffect } from "react";

export function Page({
  children,
  back = true,
}: PropsWithChildren<{
  back?: boolean;
}>) {
  const navigate = useNavigate();

  useEffect(() => {
    if (back) {
      showBackButton();
      onBackButtonClick(() => {
        navigate(-1);
      });
      return;
    }
    hideBackButton();
  }, [back]);

  return <>{children}</>;
}
