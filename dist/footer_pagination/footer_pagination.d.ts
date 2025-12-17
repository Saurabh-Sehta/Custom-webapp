import React from 'react';
import './footer_pagination.scss';
type Props = {
    page: number;
    total: number;
    itemsPerPage: number;
    onNextPage: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onPreviousPage: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
};
export declare const FooterPagination: ({ page, total, itemsPerPage, onNextPage, onPreviousPage, }: Props) => React.JSX.Element;
export {};
