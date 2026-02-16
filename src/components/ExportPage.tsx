import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlbum } from '../states/albumStore';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { TokenHighlightInput } from './TokenHighlightInput';
import { ExportSelectionGrid } from './ExportSelectionGrid';

export const ExportPage: React.FC = () => {
    const navigate = useNavigate();
    const album = useAlbum();

    // Form state
    const [zipName, setZipName] = useState(album?.name ? album.name.replace(/[^a-z0-9]/gi, '_') : 'my_album');
    const [exportUnit, setExportUnit] = useState<'page' | 'spread'>('page');
    const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
    const [template, setTemplate] = useState('{page}.jpeg');
    const [isTemplateUserEdited, setIsTemplateUserEdited] = useState(false);

    // Multi-step state
    const [step, setStep] = useState<'settings' | 'selection'>('settings');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Sync template default when unit or format changes, unless user edited it
    React.useEffect(() => {
        if (!isTemplateUserEdited) {
            const unitKey = exportUnit === 'page' ? '{page}' : '{spread}';
            const extension = format === 'jpeg' ? 'jpeg' : 'png';
            setTemplate(`${unitKey}.${extension}`);
        }
    }, [exportUnit, format, isTemplateUserEdited]);

    const handleBack = () => {
        if (step === 'selection') {
            setStep('settings');
        } else {
            navigate('/edit');
        }
    };

    const handleNext = () => {
        // Initialize selection with all IDs when moving to selection step
        const allIds = new Set<string>();
        album?.spreads.forEach(spread => {
            if (exportUnit === 'page') {
                allIds.add(`${spread.id}:left`);
                allIds.add(`${spread.id}:right`);
            } else {
                allIds.add(spread.id);
            }
        });
        setSelectedIds(allIds);
        setStep('selection');
    };

    if (!album) {
        return (
            <div className="export-page-container">
                <div className="export-content">
                    <p>No album loaded.</p>
                    <button className="btn btn-primary" onClick={handleBack}>Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="export-page-container" data-testid="export-page">
            <header className="export-header">
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={handleBack}
                    title={step === 'selection' ? 'Back to Settings' : 'Back to Editor'}
                    data-testid="export-back-button"
                >
                    <ArrowLeftIcon width="20" height="20" />
                </button>
                <h1>{step === 'selection' ? 'Select Pages to Export' : 'Export Album'}</h1>
            </header>

            <main className="export-main">
                {step === 'settings' ? (
                    <div className="export-card">
                        <section className="export-section">
                            <h2>Download Package</h2>
                            <div className="form-group">
                                <label htmlFor="zipName">ZIP Filename</label>
                                <div className="input-with-suffix">
                                    <input
                                        id="zipName"
                                        type="text"
                                        value={zipName}
                                        onChange={(e) => setZipName(e.target.value)}
                                        placeholder="Enter filename"
                                    />
                                    <span className="input-suffix">.zip</span>
                                </div>
                            </div>
                        </section>

                        <hr className="divider" />

                        <section className="export-section">
                            <h2>Image Settings</h2>

                            <div className="form-group">
                                <label>Export Unit</label>
                                <div className="radio-group">
                                    <label className={`radio-card ${exportUnit === 'page' ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            name="exportUnit"
                                            value="page"
                                            checked={exportUnit === 'page'}
                                            onChange={() => setExportUnit('page')}
                                        />
                                        <div className="radio-content">
                                            <span className="radio-title">Each Page</span>
                                            <br />
                                            <span className="radio-desc">Split spreads into two separate files</span>
                                        </div>
                                    </label>
                                    <label className={`radio-card ${exportUnit === 'spread' ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            name="exportUnit"
                                            value="spread"
                                            checked={exportUnit === 'spread'}
                                            onChange={() => setExportUnit('spread')}
                                        />
                                        <div className="radio-content">
                                            <span className="radio-title">Each Spread</span>
                                            <br />
                                            <span className="radio-desc">Export each spread as one single image</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>File Format</label>
                                <div className="segmented-control">
                                    <button
                                        className={`segment ${format === 'jpeg' ? 'active' : ''}`}
                                        onClick={() => setFormat('jpeg')}
                                    >
                                        JPEG
                                    </button>
                                    <button
                                        className={`segment ${format === 'png' ? 'active' : ''}`}
                                        onClick={() => setFormat('png')}
                                    >
                                        PNG
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="filenameTemplate">Individual Filename Template</label>
                                <TokenHighlightInput
                                    id="filenameTemplate"
                                    value={template}
                                    onChange={(val) => {
                                        setTemplate(val);
                                        setIsTemplateUserEdited(true);
                                    }}
                                    placeholder="{page}.jpeg"
                                />
                                <p className="form-help">
                                    Use <code>{"{spread}"}</code> for spread index and <code>{"{page}"}</code> for page index.
                                </p>
                            </div>
                        </section>

                        <footer className="export-footer">
                            <button className="btn btn-primary btn-lg btn-block" onClick={handleNext}>
                                Next
                            </button>
                        </footer>
                    </div>
                ) : (
                    <div className="export-full-view">
                        <ExportSelectionGrid
                            album={album}
                            exportUnit={exportUnit}
                            selectedIds={selectedIds}
                            onToggle={(id) => {
                                const next = new Set(selectedIds);
                                if (next.has(id)) next.delete(id);
                                else next.add(id);
                                setSelectedIds(next);
                            }}
                            onSelectAll={() => {
                                const allIds = new Set<string>();
                                album.spreads.forEach(spread => {
                                    if (exportUnit === 'page') {
                                        allIds.add(`${spread.id}:left`);
                                        allIds.add(`${spread.id}:right`);
                                    } else {
                                        allIds.add(spread.id);
                                    }
                                });
                                setSelectedIds(allIds);
                            }}
                            onSelectNone={() => setSelectedIds(new Set())}
                        />
                        <footer className="export-footer" style={{ maxWidth: '400px', alignSelf: 'center', width: '100%' }}>
                            <button
                                className="btn btn-primary btn-lg btn-block"
                                disabled={selectedIds.size === 0}
                            >
                                Generate Export ({selectedIds.size})
                            </button>
                            <p className="text-muted text-center" style={{ marginTop: '1rem', fontSize: 'var(--text-xs)' }}>
                                Functionality coming soon.
                            </p>
                        </footer>
                    </div>
                )}
            </main>
        </div>
    );
};
