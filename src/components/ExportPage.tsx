import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAlbum } from '../states/albumStore';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { TokenHighlightInput } from './TokenHighlightInput';
import { ExportSelectionGrid } from './ExportSelectionGrid';
import { APP_CONFIG } from '../config';
import { ExportWorkerRequest, ExportWorkerResponse } from '../workers/exportProcessor';

export const ExportPage: React.FC = () => {
    const navigate = useNavigate();
    const album = useAlbum();

    // Form state
    const [zipName, setZipName] = useState(album?.name ? album.name.replace(/[^a-z0-9]/gi, '_') : 'my_album');
    const [exportUnit, setExportUnit] = useState<'page' | 'spread'>('page');
    const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
    const [template, setTemplate] = useState('{page}.jpeg');
    const [isTemplateUserEdited, setIsTemplateUserEdited] = useState(false);
    const [quality, setQuality] = useState(85);

    // Multi-step state
    const [step, setStep] = useState<'settings' | 'selection'>('settings');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    // Sync template default when unit or format changes, unless user edited it
    useEffect(() => {
        if (!isTemplateUserEdited) {
            const unitKey = exportUnit === 'page' ? '{page}' : '{spread}';
            const extension = format === 'jpeg' ? 'jpeg' : 'png';
            setTemplate(`${unitKey}.${extension}`);
        }
    }, [exportUnit, format, isTemplateUserEdited]);

    const handleBack = () => {
        if (isGenerating) return;
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

    const getFilename = (id: string, index: number, extension: string) => {
        let name = template;
        if (exportUnit === 'page') {
            const side = id.split(':')[1];
            const pageNum = index * 2 + (side === 'left' ? 1 : 2);
            name = name.replace('{page}', pageNum.toString().padStart(3, '0'));
            name = name.replace('{spread}', (index + 1).toString().padStart(3, '0'));
        } else {
            name = name.replace('{spread}', (index + 1).toString().padStart(3, '0'));
            name = name.replace('{page}', `${(index * 2 + 1).toString().padStart(3, '0')}-${(index * 2 + 2).toString().padStart(3, '0')}`);
        }

        // Ensure extension matches format
        if (!name.toLowerCase().endsWith(extension)) {
            name = name + '.' + extension;
        }
        return name;
    };

    const handleGenerate = async () => {
        if (!album || selectedIds.size === 0) return;

        setIsGenerating(true);
        setProgress(0);

        try {
            const zip = new JSZip();
            const selectedArray = Array.from(selectedIds);
            const total = selectedArray.length;
            let finishedCount = 0;

            // Use a worker pool based on CPU cores (max 4 to stay safe)
            const workerCount = Math.max(1, Math.min(navigator.hardwareConcurrency || 4, 4));
            const queue = [...selectedArray];

            const runWorker = (): Promise<void> => {
                return new Promise((resolve) => {
                    const worker = new Worker(new URL('../workers/exportProcessor.ts', import.meta.url), { type: 'module' });

                    const processNext = () => {
                        const id = queue.shift();
                        if (!id) {
                            worker.terminate();
                            resolve();
                            return;
                        }

                        const [spreadId, side] = id.split(':');
                        const spreadIdx = album.spreads.findIndex(s => s.id === spreadId);
                        const spread = album.spreads[spreadIdx];

                        worker.onmessage = (e: MessageEvent<ExportWorkerResponse>) => {
                            const { blob, error } = e.data;
                            if (error) {
                                console.error(`Error exporting ${id}:`, error);
                            } else if (blob) {
                                const filename = getFilename(id, spreadIdx, format === 'jpeg' ? 'jpeg' : 'png');
                                zip.file(filename, blob);
                            }

                            finishedCount++;
                            setProgress(Math.round((finishedCount / total) * 100));
                            processNext();
                        };

                        worker.postMessage({
                            spread,
                            settings: album.settings,
                            options: {
                                ppi: APP_CONFIG.PPI,
                                format,
                                quality: quality / 100,
                                splitPage: side as 'left' | 'right',
                            }
                        } as ExportWorkerRequest);
                    };
                    processNext();
                });
            };

            // Launch workers in parallel
            await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

            // Generate Final ZIP
            setProgress(99); // Finalizing
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${zipName}.zip`);

        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. Please check the console for details.');
        } finally {
            // Keep status at 100% for 1.5 seconds before resetting
            setTimeout(() => {
                setIsGenerating(false);
                setProgress(0);
            }, 1500);
        }
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
                    disabled={isGenerating}
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

                            {format === 'jpeg' && (
                                <div className="form-group slide-fade-in" style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <label htmlFor="quality" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span>JPEG Quality</span>
                                        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{quality}%</span>
                                    </label>
                                    <input
                                        id="quality"
                                        type="range"
                                        min="10"
                                        max="100"
                                        step="5"
                                        value={quality}
                                        onChange={(e) => setQuality(parseInt(e.target.value))}
                                        style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                                    />
                                    <p className="form-help" style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.6 }}>
                                        Higher quality results in larger file sizes. 85% is recommended for best balance.
                                    </p>
                                </div>
                            )}

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
                                disabled={selectedIds.size === 0 || isGenerating}
                                onClick={handleGenerate}
                            >
                                {isGenerating ? (
                                    progress >= 100 ? 'Export Complete!' : `Generating... ${progress}%`
                                ) : (
                                    `Generate Export (${selectedIds.size})`
                                )}
                            </button>
                            {isGenerating && (
                                <div className="export-progress-bar" style={{ marginTop: '1rem', width: '100%', height: '4px', background: 'var(--color-bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progress}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.3s ease-out' }} />
                                </div>
                            )}
                        </footer>
                    </div>
                )}
            </main>
        </div>
    );
};
