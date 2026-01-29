'use client';

import React from 'react';

type ConfirmButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
};

export default function ConfirmButton({
  confirmMessage,
  onClick,
  ...rest
}: ConfirmButtonProps) {
  return (
    <button
      {...rest}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
