"use client";

import type { ComponentProps } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;

interface PendingSubmitButtonProps extends ButtonProps {
  pendingLabel: string;
}

export function PendingSubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={disabled || pending}>
      {pending ? (
        <>
          <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
