import React from 'react';
import { Page } from '../types';
import { getTemplate } from '../templates/pageTemplates';

interface PageNavigatorProps {
    pages: Page[];
    currentPageIndex: number;
    onPageSelect: (index: number) => void;
    onAddPage: () => void;
    onDeletePage: (pageId: string) => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
    pages,
    currentPageIndex,
    onPageSelect,
    onAddPage,
    onDeletePage,
}) => {
    return (
        <aside className="page-navigator">
            <div className="page-navigator-header">
                <span className="page-navigator-title">Pages</span>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                </span>
            </div>

            <div className="page-list">
                {pages.map((page, index) => (
                    <PageThumbnail
                        key={page.id}
                        page={page}
                        index={index}
                        isActive={index === currentPageIndex}
                        canDelete={pages.length > 1}
                        onClick={() => onPageSelect(index)}
                        onDelete={() => onDeletePage(page.id)}
                    />
                ))}

                <button className="add-page-btn" onClick={onAddPage}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Add Page
                </button>
            </div>
        </aside>
    );
};

interface PageThumbnailProps {
    page: Page;
    index: number;
    isActive: boolean;
    canDelete: boolean;
    onClick: () => void;
    onDelete: () => void;
}

const PageThumbnail: React.FC<PageThumbnailProps> = ({
    page,
    index,
    isActive,
    canDelete,
    onClick,
    onDelete,
}) => {
    const template = getTemplate(page.templateId);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Delete this page?')) {
            onDelete();
        }
    };

    return (
        <div
            className={`page-thumbnail ${isActive ? 'active' : ''}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
            <div className="page-thumbnail-content">
                {page.elements.length > 0 ? (
                    <ThumbnailPreview page={page} />
                ) : (
                    <span>{template.name}</span>
                )}
            </div>

            <span className="page-thumbnail-number">{index + 1}</span>

            {canDelete && (
                <button
                    className="page-thumbnail-delete"
                    onClick={handleDelete}
                    title="Delete page"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            )}
        </div>
    );
};

interface ThumbnailPreviewProps {
    page: Page;
}

const ThumbnailPreview: React.FC<ThumbnailPreviewProps> = ({ page }) => {
    // Show the first image as thumbnail preview
    const firstImage = page.elements[0];
    if (!firstImage) return null;

    // Use thumbnail URL directly (sources provide full URLs)
    const thumbnailUrl = firstImage.thumbnailUrl || firstImage.imageUrl;

    return (
        <img
            src={thumbnailUrl}
            alt="Page preview"
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
            }}
        />
    );
};

